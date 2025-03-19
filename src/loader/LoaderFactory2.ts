/**
 *@description: Tile Loader factory
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { SceneLoader, Observable } from "@babylonjs/core";
import { ISource } from "../source";
import { ITileGeometryLoader, ITileMaterialLoader } from "./ITileLoaders2";
import { author, version } from "..";

console.log(`====================babylon-tile V${version}==============================`);

export class TileLoadingManager extends SceneLoader {
	public onParseEnd?: (url: string) => void = undefined;
	public readonly onStartObservable = new Observable<{taskName: string; loaded: number; total: number}>();
	public readonly onErrorObservable = new Observable<string>();
	public readonly onCompleteObservable = new Observable<void>();
	public readonly onProgressObservable = new Observable<{taskName: string; loaded: number; total: number}>();

	public parseEnd(url: string) {
		this.onParseEnd && this.onParseEnd!(url);
	}
}

/**
 * Factory for loader
 */
export const LoaderFactory = {
	manager: new TileLoadingManager(),
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
		loader.info.author = loader.info.author ?? author.name;
		console.log(`* Register imageLoader: '${loader.dataType}', Author: '${loader.info.author}'`);
	},

	/**
	 * Register geometry loader
	 * @param loader geometry loader
	 */
	registerGeometryLoader(loader: ITileGeometryLoader) {
		LoaderFactory.demLoaderMap.set(loader.dataType, loader);
		loader.info.author = loader.info.author ?? author.name;
		console.log(`* Register terrainLoader: '${loader.dataType}', Author: '${loader.info.author}'`);
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

	getLoadersInfo() {
		const imgLoaders = Array.from(this.imgLoaderMap.values()).map((loader) => ({
			category: "image",
			dataType: loader.dataType,
			info: loader.info,
		}));
		const demLoaders = Array.from(this.demLoaderMap.values()).map((loader) => ({
			category: "terrain",
			dataType: loader.dataType,
			info: loader.info,
		}));
		return [...imgLoaders, ...demLoaders];
	},
};
 