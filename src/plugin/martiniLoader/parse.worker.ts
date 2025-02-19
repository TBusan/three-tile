import { Martini } from "./Martini";
import { addSkirt } from "../../loader";

// worker.ts
self.onmessage = (msg: MessageEvent) => {
	const { imgData, z } = msg.data;
	// console.time("parse");
	const dem = getTerrain(imgData);
	const mesh = parse(dem, z);
	// console.timeEnd("parse");
	// console.log(msg.type, mesh);

	// 将结果发送回主线程
	self.postMessage(mesh);
	self.close();
};

const maxErrors: { [key: number]: number } = {
	0: 7000,
	1: 6000,
	2: 5000,
	3: 4000,
	4: 3000,
	5: 2500,
	6: 2000,
	7: 1500,
	8: 800,
	9: 500,
	10: 200,
	11: 100,
	12: 40,
	13: 12,
	14: 5,
	15: 2,
	16: 1,
	17: 0.5,
	18: 0.2,
	19: 0.1,
	20: 0.05,
};

/**
 * 解析高程数据并生成网格模型
 *
 * @param dem 高程数据，Float32Array类型
 * @param z 缩放级别
 * @returns 包含顶点索引和属性的对象
 */
function parse(dem: Float32Array, z: number) {
	// 计算网格大小
	const gridSize = Math.floor(Math.sqrt(dem.length));

	// 构建Martin
	const martini = new Martini(gridSize);
	// 简化
	const tile = martini.createTile(dem);
	// 几何误差
	const maxError = maxErrors[z] / 1000 || 0;
	// 取得顶点和索引
	const { vertices, triangles } = tile.getMesh(maxError);

	// 取得属性
	const attributes = getMeshAttributes(vertices, dem);

	// 添加裙边
	const geoInfo = addSkirt(attributes, triangles, 1);

	return {
		indices: geoInfo.triangles,
		attributes: geoInfo.attributes,
		skirtIndex: vertices.length,
	};
}

/**
 * Get terrain points from image data.
 *
 * @param data - Terrain data encoded as image.
 * @returns The terrain elevation as a Float32 array.
 */
function getTerrain(imageData: ImageData): Float32Array {
	const data = imageData.data;
	const tileSize = imageData.width;
	const gridSize = tileSize + 1;

	// From Martini demo
	// https://observablehq.com/@mourner/martin-real-time-rtin-terrain-mesh
	const terrain = new Float32Array(gridSize * gridSize);

	// Decode terrain values
	for (let i = 0, y = 0; y < tileSize; y++) {
		for (let x = 0; x < tileSize; x++, i++) {
			// 透明像素直接返回高度0
			if (data[i * 4 + 3] === 0) {
				terrain[i + y] = 0;
			}
			const k = i * 4;
			const r = data[k + 0];
			const g = data[k + 1];
			const b = data[k + 2];

			const rgb = (r << 16) | (g << 8) | b;
			terrain[i + y] = rgb / 10000 - 10;
		}
	}

	// Backfill bottom border
	for (let i = gridSize * (gridSize - 1), x = 0; x < gridSize - 1; x++, i++) {
		terrain[i] = terrain[i - gridSize];
	}

	// Backfill right border
	for (let i = gridSize - 1, y = 0; y < gridSize; y++, i += gridSize) {
		terrain[i] = terrain[i - 1];
	}

	return terrain;
}

/**
 * Get the attributes that compose the mesh.
 *
 * @param vertices - Vertices.
 * @param terrain  - Terrain
 * @param tileSize - Size of each tile.
 * @param bounds - Array with the bound of the map.
 * @param exageration - Vertical exageration of the map scale.
 * @returns The position and UV coordinates of the mesh.
 */
function getMeshAttributes(vertices: Uint16Array, terrain: Float32Array) {
	const gridSize = Math.floor(Math.sqrt(terrain.length));
	const tileSize = gridSize - 1;
	const numOfVerticies = vertices.length / 2;

	// vec3. x, y in pixels, z in meters
	const positions = new Float32Array(numOfVerticies * 3);

	// vec2. 1 to 1 relationship with position. represents the uv on the texture image. 0,0 to 1,1.
	const texCoords = new Float32Array(numOfVerticies * 2);

	// 转换顶点坐标到-0.5到0.5之间，计算纹理坐标0-1之间
	for (let i = 0; i < numOfVerticies; i++) {
		const x = vertices[i * 2];
		const y = vertices[i * 2 + 1];
		const pixelIdx = y * gridSize + x;

		positions[3 * i + 0] = x / tileSize - 0.5;
		positions[3 * i + 1] = 0.5 - y / tileSize;
		positions[3 * i + 2] = terrain[pixelIdx];

		texCoords[2 * i + 0] = x / tileSize;
		texCoords[2 * i + 1] = 1 - y / tileSize;
	}

	return {
		position: { value: positions, size: 3 },
		texcoord: { value: texCoords, size: 2 },
	};
}
