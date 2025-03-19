/**
 *@description: Canvas material laoder
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Texture, Material } from "@babylonjs/core";
import { ITileMaterialLoader, TileSourceLoadParamsType } from "../loader/index2";
import { TileMaterial } from "../material/TileMaterial2";

/**
 * Canvas material laoder abstract base class
 */
export abstract class TileCanvasLoader2 implements ITileMaterialLoader {
	public readonly info = {
		version: "0.10.0",
		description: "Canvas tile abstract loader",
	};

	public dataType = "";
	public useWorker = false;

	/**
	 * Asynchronously load tile material
	 * @param params Tile loading parameters
	 * @returns Returns the tile material
	 */
	public async load(params: TileSourceLoadParamsType): Promise<Material> {
		if (!params.source.scene) {
			throw new Error("Scene is required for texture loading");
		}

		const ctx = this._creatCanvasContext(256, 256);
		this.drawTile(ctx, params);
		
		// 创建Babylon.js纹理
		const texture = new Texture("", params.source.scene, true);
		const bitmap = ctx.canvas.transferToImageBitmap();
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx2d = canvas.getContext('2d');
		if (ctx2d) {
			ctx2d.drawImage(bitmap, 0, 0);
			if (texture._texture) {
				texture._texture.url = canvas.toDataURL();
			}
		}
		bitmap.close();
		
		// 创建材质
		const material = new TileMaterial("tileMaterial", params.source.scene);
		material.setTexture(texture);
		material.alpha = params.source.opacity;

		return material;
	}

	private _creatCanvasContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("create canvas context failed");
		}
		ctx.scale(1, -1);
		ctx.translate(0, -height);
		return ctx;
	}

	/**
	 * Draw tile on canvas, protected
	 * @param ctx Tile canvas context
	 * @param params Tile load params
	 */
	protected abstract drawTile(ctx: OffscreenCanvasRenderingContext2D, params: TileSourceLoadParamsType): void;
}
