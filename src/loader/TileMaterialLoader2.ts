/**
 *@description: Image Material loader abstrace baseclass
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Material, Texture } from "@babylonjs/core";
import { ITileMaterialLoader, TileSourceLoadParamsType } from "./index2";
import { TileMaterial } from "../material/TileMaterial2";
import { LoaderFactory } from "./LoaderFactory2";
import { getSafeTileUrlAndBounds } from "./util2";

/**
 * Image loader base calss
 */
export abstract class TileMaterialLoader implements ITileMaterialLoader {
	public info = {
		version: "0.10.0",
		description: "Image loader base class",
	};

	public dataType = "";
	public useWorker = true;

	/**
	 * Load tile data from source
	 * @param source
	 * @param tile
	 * @returns
	 */
	public async load(params: TileSourceLoadParamsType): Promise<Material> {
		const { source, x, y, z } = params;
		if (!source.scene) {
			throw new Error("Scene is required for material creation");
		}
		const material = new TileMaterial("tileMaterial", source.scene);
		// get max level tile and bounds
		const { url, clipBounds } = getSafeTileUrlAndBounds(source, x, y, z);
		if (!url) {
			return material;
		}
		const texture = await this.doLoad(url, { source, x, y, z, bounds: clipBounds });
		material.setTexture(texture);
		LoaderFactory.manager.parseEnd(url);
		return material;
	}

	/**
	 * Download terrain data
	 * @param url url
	 * @returns {Promise<TBuffer>} the buffer of download data
	 */
	protected abstract doLoad(url: string, params: TileSourceLoadParamsType): Promise<Texture>;
}
 