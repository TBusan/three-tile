/**
 *@description: Modules of tile loader
 *@author: 郭江峰
 *@date: 2023-04-05
 */

// extends the threejs loader
export * from "./ITileLoaders2";

// tile factory
export * from "./LoaderFactory2";

export * from "./PromiseWorker2";

// tile utils
export * from "./util2";

// tile loader (include material loader and geometry loader)
export * from "./TileLoader2";

// texture loader
export * from "./TileTextureLoader2";

// tile geometry loader base class
export * from "./TileGeometryLoader2";
// tile material loader base class
export * from "./TileMaterialLoader2";

export * from "./TileCanvasLoader2";
