/**
 *@description: Loader factory
 *@author: Guojf
 *@date: 2023-04-06
 */

import { LoadingManager } from "three";
import { ISource } from "../source";
import { ITileGeometryLoader, ITileMaterialLoader } from "./ITileLoaders";
import { author } from "..";

/**
 * Factory for loader
 */
export const LoaderFactory = {
	manager: new LoadingManager(),
	// Dict of dem loader
	demLoaderMap: new Map<string, ITileGeometryLoader>(),
	// Dict of img loader
	imgLoaderMap: new Map<string, ITileMaterialLoader>(),

	/**
	 * Register material loader
	 * @param loader material loader
	 */
	registerMaterialLoader(loader: ITileMaterialLoader) {
		LoaderFactory.imgLoaderMap.set(loader.dataType, loader);
		console.log(`* Register imageLoader: '${loader.dataType}', Author: '${loader.author || author.name}'`);
	},

	/**
	 * Register geometry loader
	 * @param loader geometry loader
	 */
	registerGeometryLoader(loader: ITileGeometryLoader) {
		LoaderFactory.demLoaderMap.set(loader.dataType, loader);
		console.log(`* Register terrainLoader: '${loader.dataType}', Author: '${loader.author || author.name}'`);
	},

	/**
	 * Get material loader from datasource
	 * @param source datasource
	 * @returns material loader
	 */
	getMaterialLoader(source: ISource) {
		const loader = LoaderFactory.imgLoaderMap.get(source.dataType);
		if (loader) {
			return loader;
		} else {
			throw `Source dataType "${source.dataType}" is not support!`;
		}
	},

	/**
	 * Get geometry loader from datasource
	 * @param source datasouce
	 * @returns geometry loader
	 */
	getGeometryLoader(source: ISource) {
		const loader = LoaderFactory.demLoaderMap.get(source.dataType);
		if (loader) {
			return loader;
		} else {
			throw `Source dataType "${source.dataType}" is not support!`;
		}
	},
};
