/**
 *@description: Canvas material laoder
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Texture } from "@babylonjs/core";
import { ITileMaterialLoader, TileSourceLoadParamsType } from "../loader/index2";
import { TileMaterial } from "../material/index2";

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
	public async load(params: TileSourceLoadParamsType): Promise<TileMaterial> {
		const ctx = this._creatCanvasContext(256, 256);
		this.drawTile(ctx, params);
		
		// 创建Babylon.js纹理
		const texture = new Texture("", params.source.scene, true);
		texture.updateSource(ctx.canvas.transferToImageBitmap());
		
		// 创建材质
		const material = new TileMaterial("tileMaterial", params.source.scene);
		material.transparencyMode = 2; // ALPHATEST mode
		material.diffuseTexture = texture;
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
