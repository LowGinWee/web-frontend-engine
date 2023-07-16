import { IFrontendEngineBaseFieldJsonSchema } from "../../frontend-engine";
import { IStaticMapProps } from "../../shared/static-map";
import { ILocationInputProps } from "./location-input";
import { ILocationPickerProps } from "./location-modal/location-picker/types";
import { ILocationSearchProps } from "./location-modal/location-search/types";

export interface ILocationFieldSchema<V = undefined>
	extends IFrontendEngineBaseFieldJsonSchema<"location-field", V>,
		Pick<ILocationPickerProps, "interactiveMapPinIconUrl" | "mapPanZoom">,
		Pick<
			ILocationSearchProps,
			"reverseGeoCodeEndpoint" | "mustHavePostalCode" | "gettingCurrentLocationFetchMessage"
		>,
		Pick<ILocationInputProps, "locationInputPlaceholder">,
		Pick<IStaticMapProps, "staticMapPinColor"> {
	className?: string;
	mastheadHeight?: number;
}

export type TSinglePanelInputMode = "search" | "map";

// search and map will implicitly mean single panel can only show one view at a time: search or map
// double means both search and map will be seen
export type TPanelInputMode = "search" | "map" | "double";

export interface ILocationFieldValues {
	address?: string | undefined;
	blockNo?: string | undefined;
	building?: string | undefined;
	postalCode?: string | undefined;
	roadName?: string | undefined;
	lat?: number | undefined;
	lng?: number | undefined;
	x?: number | undefined;
	y?: number | undefined;
}

export interface ILocationCoord {
	lat: number;
	lng: number;
}

export interface IResultListItem extends ILocationFieldValues {
	displayAddressText?: string | undefined;
}

export interface IResultsMetaData {
	results: IResultListItem[];
	apiPageNum?: number | undefined;
	totalNumPages?: number | undefined;
}

export interface IDisplayResultListParams extends IResultsMetaData {
	queryString?: string | undefined;
	boldResults?: boolean | undefined;
}

export type TErrorType = {
	errorType: "OneMapError" | "GetLocationError" | "GetLocationTimeoutError" | "PostalCodeError";
};

export interface TLocationFieldDetail<T = unknown> {
	payload?: T | undefined;
	errors?: any | undefined;
}
export type TSetCurrentLocationDetail = TLocationFieldDetail<ILocationCoord>;

// Set the error in detail.error
export type TLocationFieldErrorDetail = TLocationFieldDetail<TErrorType>;

export type TLocationFieldEvents = {
	"get-current-location": CustomEvent;
	"set-current-location": CustomEvent<TSetCurrentLocationDetail>;
	error: CustomEvent<TLocationFieldErrorDetail>;
	"error-end": CustomEvent<TLocationFieldErrorDetail>;
};

export class GeolocationPositionErrorWrapper extends Error {
	public code;
	public message;

	public constructor(error: GeolocationPositionError) {
		super();
		Object.assign(this, error);
	}
}
