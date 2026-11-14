"""Compute patch- and image-level visual embeddings for Curiosity rover images.

Supports frozen DINOv2-small (via Hugging Face `transformers` or `torch.hub`
`facebookresearch/dinov2` `dinov2_vits14` on CPU), with a fast deterministic
multi-scale Gabor and morphological white-tophat ridge/albedo patch descriptor
fallback when `torch` is unavailable.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Tuple

import numpy as np
from PIL import Image

MODEL_HF = "facebook/dinov2-small"
HUB_REPO = "facebookresearch/dinov2"
HUB_MODEL = "dinov2_vits14"
SIZE = 448
PATCH_SIZE = 14
GRID_SIDE = SIZE // PATCH_SIZE  # 32 x 32 = 1024 patches

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def _list_images(img_dir: Path) -> list[Path]:
    return sorted(p for p in img_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)


def _extract_transformers(paths: list[Path]) -> Tuple[np.ndarray, np.ndarray, str]:
    import torch
    from transformers import AutoImageProcessor, AutoModel

    proc = AutoImageProcessor.from_pretrained(MODEL_HF, size={"height": SIZE, "width": SIZE}, do_center_crop=False)
    model = AutoModel.from_pretrained(MODEL_HF).eval()
    cls_list, patch_list = [], []
    with torch.no_grad():
        for i, p in enumerate(paths):
            img = Image.open(p).convert("RGB")
            inputs = proc(images=img, return_tensors="pt")
            hidden = model(**inputs).last_hidden_state[0]
            cls_list.append(hidden[0].cpu().numpy().astype(np.float32))
            patch_list.append(hidden[1:].cpu().numpy().astype(np.float16))
            if i % 25 == 0 or i + 1 == len(paths):
                print(f"[dinov2-hf] {i + 1}/{len(paths)} {p.name}")
    return np.stack(cls_list), np.stack(patch_list), "dinov2-small-hf"


def _extract_torch_hub(paths: list[Path]) -> Tuple[np.ndarray, np.ndarray, str]:
    import torch

    model = torch.hub.load(HUB_REPO, HUB_MODEL, verbose=False).eval()
    cls_list, patch_list = [], []
    with torch.no_grad():
        for i, p in enumerate(paths):
            img = Image.open(p).convert("RGB").resize((SIZE, SIZE), Image.Resampling.BILINEAR)
            arr = np.asarray(img, dtype=np.float32) / 255.0
            arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
            tensor = torch.from_numpy(arr.transpose(2, 0, 1)).unsqueeze(0)
            feats = model.forward_features(tensor)
            cls_tok = feats["x_norm_clstoken"][0].cpu().numpy().astype(np.float32)
            patch_tok = feats["x_norm_patchtokens"][0].cpu().numpy().astype(np.float16)
            cls_list.append(cls_tok)
            patch_list.append(patch_tok)
            if i % 25 == 0 or i + 1 == len(paths):
                print(f"[dinov2-vits14] {i + 1}/{len(paths)} {p.name}")
    return np.stack(cls_list), np.stack(patch_list), "dinov2-small-vits14"


def _build_gabor_bank() -> list[np.ndarray]:
    """Build deterministic multi-scale oriented Gabor kernels sensitive to thin bright ridges."""
    kernels = []
    for ksize, sigma, lambd in ((9, 1.8, 4.5), (15, 3.0, 7.5)):
        half = ksize // 2
        y, x = np.mgrid[-half : half + 1, -half : half + 1].astype(np.float32)
        for idx in range(6):
            theta = idx * (np.pi / 6.0)
            xr = x * np.cos(theta) + y * np.sin(theta)
            yr = -x * np.sin(theta) + y * np.cos(theta)
            env = np.exp(-0.5 * ((xr / sigma) ** 2 + (yr / (sigma * 1.6)) ** 2))
            wave = np.cos(2.0 * np.pi * xr / lambd)
            k = env * wave
            k -= k.mean()
            norm = np.linalg.norm(k) + 1e-6
            kernels.append(k / norm)
    return kernels


def _conv2d_same(img: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Fast FFT-free separable-friendly 2D correlation for small odd kernels using scipy or numpy."""
    from scipy.ndimage import correlate

    return correlate(img, kernel, mode="reflect")


def _extract_morphological(paths: list[Path]) -> Tuple[np.ndarray, np.ndarray, str]:
    """Deterministic multi-scale Gabor + morphological ridge-and-albedo patch descriptor."""
    from scipy.ndimage import gaussian_filter, grey_opening, maximum_filter, sobel

    kernels = _build_gabor_bank()
    cls_list, patch_list = [], []
    n_p = GRID_SIDE
    ps = PATCH_SIZE

    for i, p in enumerate(paths):
        img = Image.open(p).convert("RGB").resize((SIZE, SIZE), Image.Resampling.BILINEAR)
        rgb = np.asarray(img, dtype=np.float32) / 255.0
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b

        # Relative albedo excess (light-toned sulfate veins stand out against darker basaltic mudstone)
        bg_med = gaussian_filter(lum, sigma=18.0)
        albedo_excess = lum - bg_med
        red_blue_ratio = (r - b) / (r + b + 0.05)

        # Multi-scale white top-hat (bright thin structures smaller than structuring element)
        tophat_5 = lum - grey_opening(lum, size=(5, 5))
        tophat_9 = lum - grey_opening(lum, size=(9, 9))
        tophat_15 = lum - grey_opening(lum, size=(15, 15))

        # Edge gradient magnitude and Laplacian ridge sharpness
        gx = sobel(lum, axis=1)
        gy = sobel(lum, axis=0)
        grad_mag = np.hypot(gx, gy)
        lap_bright = np.maximum(0.0, lum - gaussian_filter(lum, sigma=1.6))

        # Multi-scale oriented Gabor responses (max & mean over orientations per scale)
        gabor_s1 = np.stack([np.abs(_conv2d_same(lum, k)) for k in kernels[:6]], axis=-1)
        gabor_s2 = np.stack([np.abs(_conv2d_same(lum, k)) for k in kernels[6:]], axis=-1)

        # Local peak suppression contrast
        local_max = maximum_filter(tophat_9, size=(7, 7))

        # Assemble pixel maps -> reshape into (32, 14, 32, 14) blocks -> pool per patch
        channels = [
            lum,
            albedo_excess,
            red_blue_ratio,
            tophat_5,
            tophat_9,
            tophat_15,
            grad_mag,
            lap_bright,
            local_max,
            gabor_s1.max(axis=-1),
            gabor_s1.mean(axis=-1),
            gabor_s1.std(axis=-1),
            gabor_s2.max(axis=-1),
            gabor_s2.mean(axis=-1),
            gabor_s2.std(axis=-1),
        ]
        # Compute mean and 90th-percentile-like (mean + std, max) per patch -> 15 * 3 = 45 dims
        feat_maps = np.stack(channels, axis=-1)  # [448, 448, 15]
        blocks = feat_maps.reshape(n_p, ps, n_p, ps, len(channels)).transpose(0, 2, 1, 3, 4)
        flat_blocks = blocks.reshape(n_p * n_p, ps * ps, len(channels))
        p_mean = flat_blocks.mean(axis=1)
        p_std = flat_blocks.std(axis=1)
        p_p90 = np.percentile(flat_blocks, 90, axis=1)
        patch_vec = np.concatenate([p_mean, p_std, p_p90], axis=1).astype(np.float32)

        # Image-level descriptor shares the exact 45-dim space (mean across patches)
        # so the linear classifier weights map directly onto patch descriptors.
        cls_vec = patch_vec.mean(axis=0).astype(np.float32)

        cls_list.append(cls_vec)
        patch_list.append(patch_vec.astype(np.float16))
        if i % 25 == 0 or i + 1 == len(paths):
            print(f"[morphological-gabor] {i + 1}/{len(paths)} {p.name}")

    return np.stack(cls_list), np.stack(patch_list), "morphological-gabor"


def extract_embeddings(img_dir: Path, out_path: Path, backend: str = "auto") -> dict:
    paths = _list_images(img_dir)
    if not paths:
        raise FileNotFoundError(f"No images found in {img_dir}")

    cls: np.ndarray
    patches: np.ndarray
    used_backend: str

    if backend == "morphological":
        cls, patches, used_backend = _extract_morphological(paths)
    elif backend == "dinov2":
        try:
            cls, patches, used_backend = _extract_transformers(paths)
        except ImportError:
            cls, patches, used_backend = _extract_torch_hub(paths)
    else:
        try:
            cls, patches, used_backend = _extract_transformers(paths)
        except Exception:
            try:
                cls, patches, used_backend = _extract_torch_hub(paths)
            except Exception as exc:
                print(f"[embed] DINOv2 unavailable ({exc}); falling back to morphological-gabor descriptor")
                cls, patches, used_backend = _extract_morphological(paths)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    names = np.array([p.name for p in paths])
    np.savez_compressed(
        out_path,
        names=names,
        cls=cls.astype(np.float32),
        patches=patches.astype(np.float16),
        backend=np.array(used_backend),
        size=np.array(SIZE, dtype=np.int32),
        patch_size=np.array(PATCH_SIZE, dtype=np.int32),
    )
    info = {
        "out": str(out_path),
        "n_images": len(paths),
        "cls_shape": list(cls.shape),
        "patches_shape": list(patches.shape),
        "backend": used_backend,
    }
    print(f"[embed] saved {info}")
    return info


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Extract DINOv2 or morphological patch embeddings for Mars rover images.")
    parser.add_argument("img_dir", type=Path, help="Input directory of rover JPG/PNG images")
    parser.add_argument("out", type=Path, help="Output compressed .npz path")
    parser.add_argument(
        "--backend",
        choices=("auto", "dinov2", "morphological"),
        default="auto",
        help="Feature extractor backend (default: auto)",
    )
    args = parser.parse_args(argv)
    extract_embeddings(args.img_dir, args.out, backend=args.backend)


if __name__ == "__main__":
    main(sys.argv[1:])
