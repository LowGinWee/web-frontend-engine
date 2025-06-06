import { ILocationFieldValues } from "../types";
import { ILocationPickerProps } from "./location-picker/types";
import { ILocationSearchProps } from "./location-search/types";

export interface ILocationModalProps
	extends Pick<ILocationPickerProps, "mapPanZoom" | "interactiveMapPinIconUrl">,
		Pick<
			ILocationSearchProps,
			| "reverseGeoCodeEndpoint"
			| "convertLatLngToXYEndpoint"
			| "mustHavePostalCode"
			| "gettingCurrentLocationFetchMessage"
			| "disableSearch"
			| "addressFieldPlaceholder"
			| "searchBarIcon"
			| "bufferRadius"
		> {
	id: string;
	className: string;
	showLocationModal: boolean;
	formValues?: ILocationFieldValues | undefined;
	locationModalStyles?: string | undefined;
	onClose: () => void;
	onConfirm: (values: ILocationFieldValues) => void;
	updateFormValues: (values: ILocationFieldValues, shouldDirty?: boolean) => void;
	locationListTitle?: string | undefined;
	mapBannerText?: string | undefined;
	locationSelectionMode?: "default" | "pins-only" | undefined;
}
