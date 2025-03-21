/**
 *@description: Map projection factory
 *@author: 郭江峰
 *@date: 2023-04-06
 */

import { IProjection, ProjectionType } from "./IProjection2";
import { ProjMCT } from "./ProjMCT2";
import { ProjWGS } from "./ProjWGS2";

export const ProjectFactory = {
	/**
	 * create projection object from projection ID
	 *
	 * @param id projeciton ID, default: "3857"
	 * @returns IProjection instance
	 */
	createFromID: (id: ProjectionType = "3857", lon0: number) => {
		let proj: IProjection;
		switch (id) {
			case "3857":
				proj = new ProjMCT(lon0);
				break;
			case "4326":
				proj = new ProjWGS(lon0);
				break;
			default:
				throw new Error(`Projection ID: ${id} is not supported.`);
		}
		return proj;
	},
};
