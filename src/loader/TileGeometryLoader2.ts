/**
 *@description: Geometry loader abstrace baseclass
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Mesh } from "@babylonjs/core";
import { ITileGeometryLoader, ITileLoaderInfo, TileSourceLoadParamsType } from "./index2";
import { TileGeometry } from "../geometry/index2";
import { LoaderFactory } from "./LoaderFactory2";
import { getSafeTileUrlAndBounds } from "./util2";

/**
 * Terrain loader base calss
 */
export abstract class TileGeometryLoader implements ITileGeometryLoader {
	public info: ITileLoaderInfo = {
		version: "0.10.0",
		description: "Terrain loader base class",
	};

	public dataType = "";
	public useWorker = true;

	/**
	 * load tile's data from source
	 * @param source
	 * @param tile
	 * @param onError
	 * @returns
	 */
	public async load(params: TileSourceLoadParamsType): Promise<Mesh> {
		const { source, x, y, z } = params;
		const { url, clipBounds } = getSafeTileUrlAndBounds(source, x, y, z);
		if (!url) {
			// return new TileGeometry("emptyTile", source.scene);

			return new TileGeometry("emptyTile");
		}
		const geometry = await this.doLoad(url, { source, x, y, z, bounds: clipBounds });
		LoaderFactory.manager.parseEnd(url);
		return geometry;
	}

	/**
	 * Download terrain data
	 * @param url url
	 */
	protected abstract doLoad(url: string, params: TileSourceLoadParamsType): Promise<Mesh>;
}
