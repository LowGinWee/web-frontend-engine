import { Suspense, lazy, useState } from "react";
import { IGenericFieldProps } from "../../frontend-engine";
import { StyledStaticMap } from "./location-input-group.styles";
import { LocationInput } from "./location-input/location-input";
import { ILocationInputSchema, ILocationInputValues } from "./types";

// const LocationModal = lazy(() => import("./location-modal/location-modal"));

export const LocationInputGroup = (props: IGenericFieldProps<ILocationInputSchema>) => {
	// =============================================================================
	// CONST, STATE, REFS
	// =============================================================================
	const {
		id,
		schema: {
			label,
			locationInputPlaceholder,
			// interactiveMapPinIconUrl,
			// mapPanZoom,
			// reverseGeoCodeEndpoint,
			// staticMapPinColor,
			// disableErrorPromptOnApp,
			// mustHavePostalCode,
		},
		// form values can initially be undefined when passed in via props
		value: formValue,
		onChange,
	} = props;

	const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

	// =============================================================================
	// HELPER FUNCTIONS
	// =============================================================================
	const updateFormValues = (updatedValues: ILocationInputValues) => {
		onChange?.({ target: { value: updatedValues } });
	};
	// =============================================================================
	// RENDER FUNCTIONS
	// =============================================================================

	return (
		<div>
			<LocationInput
				id={id}
				label={label}
				locationInputPlaceholder={locationInputPlaceholder}
				onChange={(e) => e.currentTarget.blur()}
				onFocus={(e) => {
					setShowLocationModal(true);
					e.currentTarget.blur();
				}}
				value={formValue?.address || ""}
			/>
			{/* {formValue?.lat && formValue?.lng && (
				<StyledStaticMap
					lat={formValue.lat}
					lng={formValue.lng}
					pinColor={staticMapPinColor}
					onClick={() => setShowLocationModal(true)}
				/>
			)} */}
			{/* <Suspense fallback={null}>
				{LocationModal && (
					<LocationModal
						id={id}
						showLocationModal={showLocationModal}
						onClose={() => setShowLocationModal(false)}
						formValues={formValue}
						mapPanZoom={mapPanZoom}
						interactiveMapPinIconUrl={interactiveMapPinIconUrl}
						reverseGeoCodeEndpoint={reverseGeoCodeEndpoint}
						onConfirm={updateFormValues}
						disableErrorPromptOnApp={disableErrorPromptOnApp}
						updateFormValues={updateFormValues}
						mustHavePostalCode={mustHavePostalCode}
					/>
				)}
			</Suspense> */}
		</div>
	);
};
