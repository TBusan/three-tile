/**
 *@description: Tile Geometry
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { Mesh, VertexData } from "@babylonjs/core";
import { GeometryDataType } from "./GeometryDataTypes2";
import { getGeometryDataFromDem } from "./utils2";


/**
 * Inherit of PlaneGeometry, add setData and setDEM method
 */
export class TileGeometry extends Mesh {
	public readonly type = "TileGeometry";

	/**
	 * set attribute data to geometry
	 * @param geometryData geometry data
	 * @returns this
	 */
	public setData(geometryData: GeometryDataType) {
		const vertexData = new VertexData();
		
		vertexData.indices = Array.from(geometryData.indices);
		vertexData.positions = Array.from(geometryData.attributes.position.value);
		vertexData.uvs = Array.from(geometryData.attributes.texcoord.value);
		vertexData.normals = Array.from(geometryData.attributes.normal.value);

		vertexData.applyToMesh(this);
		
		// Babylon.js automatically computes bounding info when applying vertex data
		this.refreshBoundingInfo();
		
		return this;
	}

	/**
	 * set DEM data to geometry
	 *
	 * @param dem Float32Array类型，表示地形高度图数据
	 * @returns 返回设置地形高度图数据后的对象
	 */
	public setDEM(dem: Float32Array) {
		const geoData = getGeometryDataFromDem(dem, true);
		return this.setData(geoData);
	}
}
