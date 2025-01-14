import { ProjectionType, ISource } from "./ISource";

/**
 * source construtor params type
 */
export interface SourceOptions {
	/** A string identifies the source data type, it requires the support of the loader. */
	dataType?: string;
	/** Source attribution info, it allows you to display attribution*/
	attribution?: string;
	/** Data max level */
	minLevel?: number;
	/** Data min level */
	maxLevel?: number;
	/** Data projection */
	projectionID?: ProjectionType;
	/** Display opacity */
	opacity?: number;
	/* Data bounds， */
	bounds?: [number, number, number, number];
	/** Data Url template */
	url?: string;
	/** Url subdomains array or string */
	subdomains?: string[] | string;
}

/**
 * base source class, custom source can inherit from it
 */
export class TileSource implements ISource {
	public dataType = "image";
	public attribution = "ThreeTile";
	public minLevel = 0;
	public maxLevel = 19;
	public projectionID: ProjectionType = "3857";
	public url = "";
	protected subdomains: string[] | string = [];
	protected s: string = "";
	public opacity: number = 1.0;
	// public bounds: [number, number, number, number] = [60, 10, 140, 60];
	//public bounds: [number, number, number, number] = [-180, -85.05112877980659, 180, 85.05112877980659];
	public bounds: [number, number, number, number] = [-180, -90, 180, 90];
	public _projectionBounds: [number, number, number, number] = [0, 0, 0, 0];
	/**
	 * constructor
	 * @param options
	 */
	constructor(options?: SourceOptions) {
		Object.assign(this, options);
	}

	/**
	 * Get url from tile coordinate, public，called by TileLoader
	 * @param x
	 * @param y
	 * @param z
	 * @returns url
	 */
	public getTileUrl(x: number, y: number, z: number) {
		// get subdomains random
		const subLen = this.subdomains.length;
		if (subLen > 0) {
			const index = Math.floor(Math.random() * subLen);
			this.s = this.subdomains[index];
		}
		return this.getUrl(x, y, z);
	}

	/**
	 * Get url from tile coordinate, protected, overwrite to custom generation tile url from xyz
	 * @param x
	 * @param y
	 * @param z
	 * @returns url
	 */
	protected getUrl(x: number, y: number, z: number): string | undefined {
		const obj = Object.assign({}, this, { x, y, z });
		return strTemplate(this.url, obj);
	}

	/**
	 * source factory function, create source directly through factoy functions.
	 * @param options
	 * @returns ISource
	 */
	public static create(options: SourceOptions) {
		return new TileSource(options);
	}
}

// https://github.com/Leaflet/Leaflet/blob/main/src/core/Util.js
// @function template(str: String, data: Object): String
// Simple templating facility, accepts a template string of the form `'Hello {a}, {b}'`
// and a data object like `{a: 'foo', b: 'bar'}`, returns evaluated string
// `('Hello foo, bar')`. You can also specify functions instead of strings for
// data values — they will be evaluated passing `data` as an argument.
function strTemplate(str: string, data: { [name: string]: any }) {
	const templateRe = /\{ *([\w_ -]+) *\}/g;
	return str.replace(templateRe, (str, key) => {
		let value = data[key];
		if (value === undefined) {
			throw new Error(`source url template error, No value provided for variable: ${str}`);
		} else if (typeof value === "function") {
			value = value(data);
		}
		return value;
	});
}
