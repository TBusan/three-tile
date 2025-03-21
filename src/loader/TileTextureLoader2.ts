/**
 *@description: Texture loader
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Texture } from "@babylonjs/core";
import { ISource } from "../source/index2";
import { LoaderFactory } from "./LoaderFactory2";
import { getSafeTileUrlAndBounds, getBoundsCoord } from "./util2";

/**
 * texture loader
 */
export class TileTextureLoader2 {
	/**
	 * load the tile texture
	 * @param tile tile to load
	 * @param source datasource
	 * @returns texture
	 */
	public async load(source: ISource, x: number, y: number, z: number): Promise<Texture> {
		if (!source.scene) {
			throw new Error("Scene is required for texture loading");
		}
		// 创建空纹理
		const texture = new Texture("", source.scene);
		texture.gammaSpace = true;

		// get the max level and bounds in tile
		const { url, clipBounds } = getSafeTileUrlAndBounds(source, x, y, z);

		if (!url) {
			return texture;
		}

		// 加载图片
		const image = await this.loadImage(url);

		// if the tile level is greater than max level, clip the max level parent of this tile image
		if (z > source.maxLevel) {
			const subImage = getSubImageFromRect(image, clipBounds);
			const canvas = document.createElement('canvas');
			canvas.width = subImage.width;
			canvas.height = subImage.height;
			const ctx = canvas.getContext('2d');
			ctx?.drawImage(subImage, 0, 0);
			const base64 = canvas.toDataURL();
			const newTexture = await Texture.CreateFromBase64String("", base64, source.scene);
			Object.assign(texture, newTexture);
		} else {
			const canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;
			const ctx = canvas.getContext('2d');
			ctx?.drawImage(image, 0, 0);
			const base64 = canvas.toDataURL();
			const newTexture = await Texture.CreateFromBase64String("", base64, source.scene);
			Object.assign(texture, newTexture);
		}

		LoaderFactory.manager.parseEnd(url);
		return texture;
	}

	private loadImage(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});
	}
}

/**
 * get sub image in rect from source image
 * @param image source image
 * @bounds  rect (orgin is (0,0), range is (-1,1))
 * @returns sub image
 */
function getSubImageFromRect(image: HTMLImageElement, bounds: [number, number, number, number]): ImageBitmap {
	const size = image.width;
	const canvas = new OffscreenCanvas(size, size);
	const ctx = canvas.getContext("2d")!;
	const { sx, sy, sw, sh } = getBoundsCoord(bounds, image.width);
	ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
	return canvas.transferToImageBitmap();
}
