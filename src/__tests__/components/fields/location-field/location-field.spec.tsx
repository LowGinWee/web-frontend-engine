import { MediaWidths } from "@lifesg/react-design-system";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MockViewport, mockIntersectionObserver, mockViewport, mockViewportForTestGroup } from "jsdom-testing-mocks";
import { useEffect, useRef } from "react";
import {
	FrontendEngine,
	IFrontendEngineData,
	IFrontendEngineProps,
	IFrontendEngineRef,
	IYupValidationRule,
} from "../../../../components";
import { ILocationFieldSchema, TSetCurrentLocationDetail } from "../../../../components/fields";
import { LocationHelper } from "../../../../components/fields/location-field/location-helper";
import { ERROR_MESSAGES } from "../../../../components/shared";
import { GeoLocationHelper, TestHelper } from "../../../../utils";
import {
	ERROR_MESSAGE,
	FRONTEND_ENGINE_ID,
	FrontendEngineWithCustomButton,
	TOverrideField,
	TOverrideSchema,
	getErrorMessage,
	getResetButton,
	getResetButtonProps,
	getSubmitButton,
	getSubmitButtonProps,
} from "../../../common";
import {
	fetchSingleLocationByLatLngSingleReponse,
	mock1PageFetchAddressResponse,
	mockEmptyFetchAddressResponse,
	mockInputValues,
	mockReverseGeoCodeResponse,
	mockStaticMapDataUri,
} from "./mock-values";
jest.mock("../../../../services/onemap/onemap-service.ts");

const io = mockIntersectionObserver();

const SUBMIT_FN = jest.fn();
const COMPONENT_ID = "field";
const UI_TYPE = "location-field";
const LABEL = "Location field";

const setCurrentLocationSpy = jest.fn();

enum ELocationInputEvents {
	"SET_CURRENT_LOCATION" = "set-current-location",
	"GET_CURRENT_LOCATION" = "get-current-location",
	"MOUNT" = "mount",
}
interface ICustomFrontendEngineProps extends IFrontendEngineProps {
	locationDetails?: TSetCurrentLocationDetail;
	withEvents: boolean;
}
const FrontendEngineWithEventListener = ({
	withEvents,
	locationDetails,
	...otherProps
}: ICustomFrontendEngineProps) => {
	const formRef = useRef<IFrontendEngineRef>();

	useEffect(() => {
		if (!withEvents || !locationDetails) return;

		const { addFieldEventListener, dispatchFieldEvent, removeFieldEventListener } = formRef.current;

		const handleAddFieldEventListener = () => {
			addFieldEventListener(
				ELocationInputEvents.GET_CURRENT_LOCATION,
				COMPONENT_ID,
				setCurrentLocationSpy.mockImplementation((e) => {
					e.preventDefault();

					dispatchFieldEvent<TSetCurrentLocationDetail>(
						ELocationInputEvents.SET_CURRENT_LOCATION,
						COMPONENT_ID,
						locationDetails
					);
				})
			);
		};

		const handleRemoveFieldEventListener = () => {
			removeFieldEventListener(ELocationInputEvents.GET_CURRENT_LOCATION, COMPONENT_ID, setCurrentLocationSpy);
		};

		handleAddFieldEventListener();
		return () => handleRemoveFieldEventListener();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <FrontendEngine {...otherProps} ref={formRef} />;
};

interface IRenderProps {
	overrideField?: TOverrideField<ILocationFieldSchema>;
	overrideSchema?: TOverrideSchema;
	withEvents: boolean;
	locationDetails?: TSetCurrentLocationDetail;
	validation?: IYupValidationRule[];
}

const renderComponent = (
	{ overrideField, overrideSchema, locationDetails, withEvents, validation }: IRenderProps = { withEvents: false }
) => {
	const json: IFrontendEngineData = {
		id: FRONTEND_ENGINE_ID,
		sections: {
			section: {
				uiType: "section",
				children: {
					[COMPONENT_ID]: {
						label: LABEL,
						uiType: UI_TYPE,
						validation,
						...overrideField,
					},
					...getSubmitButtonProps(),
				},
			},
		},
		...overrideSchema,
	};

	return render(
		<FrontendEngineWithEventListener
			data={json}
			onSubmit={SUBMIT_FN}
			locationDetails={locationDetails}
			withEvents={withEvents}
		/>
	);
};

const testIdCmd = (query = false) => {
	return query ? screen.queryByTestId : screen.getByTestId;
};

const getLocationModal = (query = false, view = "show") => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "modal", view));
};

const getLocationPicker = (query = false, view = "show") => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-picker", view));
};

const getLocationSearch = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search"));
};

const getLocationSearchResults = (query = false, view = "double") => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search-results", view));
};

const getLocationCloseButton = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search-modal-close"));
};

const getCurrentLocationErrorModal = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show"));
};

const getLocationSearchInput = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search-modal-input"));
};

const getLocationInput = (query = false) => {
	return within(testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-input"))).getByTestId("input");
};

const getLocationSearchClearButton = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search-input-clear"));
};

const getLocationModalControlButtons = (type, query = false) => {
	return within(testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "location-search-controls"))).getByText(type);
};

const getStaticMap = (query = false) => {
	return testIdCmd(query)(TestHelper.generateId(COMPONENT_ID, "static-map"));
};

// assert network error

/**
 * TODO check error state at every interaction juncture?
 *
 * What to test?
 *
 * We have the normal actions
 * Each action have variation depending on side effect resolution and current state
 * Then we have stateful changes that dont need user input
 *
 * We test
 * - following user actions
 * - then non-user actions (changes that can happen without user action)
 * - external state variations (device or api (non-failures))
 * - internal state variations (component)
 * - error handling
 *
 * TODO:
 * double check all network calls are mocked
 * trace broken test
 * break down test files
 * - events
 * - search
 * - map
 * - full flow
 *
 * FIXME
 * Testing geolocation errors is inconsistent and unpredictabl
 * - hard to mock
 * - geolocation error is not an instanceof erro
 * - cant seem to match the GeolocationPositionError class
 */

describe("location-input-group", () => {
	let fetchAddressSpy;
	let getCurrentLocationSpy;
	let reverseGeocodeSpy;
	let viewport: MockViewport;
	let staticMapSpy;
	let fetchSingleLocationByAddressSpy;
	let fetchSingleLocationByLatLngSpy;

	const setWindowAndViewPort = (width: number, height = MediaWidths.tablet) => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			value: MediaWidths.mobileS, // Set the desired screen width for the desktop view
		});
		Object.defineProperty(window, "innerHeight", {
			writable: true,
			value: MediaWidths.mobileS, // Set the desired screen width for the desktop view
		});

		const createMockVisualViewport = (width, height) => ({
			width,
			height,
			offsetLeft: 0,
			offsetTop: 0,
			pageLeft: 0,
			pageTop: 0,
			scale: 1,
			zoom: 1,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		});

		const mockVisualViewport = createMockVisualViewport(width, height);
		Object.defineProperty(window, "visualViewport", {
			writable: true,
			value: mockVisualViewport,
		});

		viewport.set({
			width,
			height: MediaWidths.tablet,
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		getCurrentLocationSpy = jest.spyOn(GeoLocationHelper, "getCurrentLocation");
		fetchAddressSpy = jest.spyOn(LocationHelper, "debounceFetchAddress");
		reverseGeocodeSpy = jest.spyOn(LocationHelper, "reverseGeocode");
		fetchSingleLocationByAddressSpy = jest.spyOn(LocationHelper, "fetchSingleLocationByAddress");
		staticMapSpy = jest.spyOn(LocationHelper, "getStaticMapUrl").mockReturnValue(mockStaticMapDataUri);
		fetchSingleLocationByLatLngSpy = jest.spyOn(LocationHelper, "fetchSingleLocationByLatLng");

		viewport = mockViewport({
			width: MediaWidths.tablet,
			height: MediaWidths.tablet,
		});
		setWindowAndViewPort(MediaWidths.desktopL);
	});

	afterEach(() => {
		delete window.visualViewport;
		delete window.innerWidth;
		delete window.innerHeight;
		viewport.cleanup();
		getCurrentLocationSpy.mockReset();
		fetchAddressSpy.mockRestore();
		reverseGeocodeSpy.mockRestore();
		staticMapSpy.mockRestore();
		fetchSingleLocationByAddressSpy.mockRestore();
		fetchSingleLocationByLatLngSpy.mockRestore();
	});

	/**
	 * Control is inverted and now I need to figure what needs to be passed from
	 * device and what information should live in FE
	 *
	 * Analyze what the prop really wants to do
	 * Generalize the use case
	 *
	 * Data refactoring
	 * What data objects do I need
	 * What variance do I need for ui elements
	 * What formatting is needed at which level?
	 *
	 * When something is hard to test and mocked
	 * - probably too decoupled
	 * - too complicated
	 * - unintuitive
	 */
	describe("events", () => {
		describe("geolocation events", () => {
			// When does it request
			// - open location
			// - when you click on the picker button

			it("should run default location getCurrentLocation", async () => {
				getCurrentLocationSpy.mockResolvedValue({
					lat: 1.29994179707526,
					lng: 103.789404349716,
				});

				renderComponent({ withEvents: false });

				await waitFor(() => window.dispatchEvent(new Event("online")));

				expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
				expect(screen.getByLabelText(LABEL)).toBeInTheDocument();

				getLocationInput().focus();

				await waitFor(() => {
					expect(getCurrentLocationErrorModal(true)).not.toBeInTheDocument();
					expect(getLocationPicker(true)).toBeInTheDocument();
					expect(getLocationSearch(true)).toBeInTheDocument();
				});
			});

			it.todo(
				"should handle when navigator does not support geolocation in default location getCurrentLocation "
			);

			it("should set-current-location when FE requests for current location", async () => {
				const locationDetails = {
					payload: {
						lat: 1.29994179707526,
						lng: 103.789404349716,
					},
				};
				renderComponent({ withEvents: true, locationDetails });
				await waitFor(() => window.dispatchEvent(new Event("online")));

				expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
				expect(screen.getByLabelText(LABEL)).toBeInTheDocument();

				getLocationInput().focus();

				expect(setCurrentLocationSpy).toBeCalled();

				// test for side effects

				expect(
					screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-timeout-error", "show"))
				).not.toBeInTheDocument();

				expect(
					screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show"))
				).not.toBeInTheDocument();
			});

			it("should handle timeout GeolocationPositionError when FE requests for current location", async () => {
				renderComponent({
					withEvents: true,
					locationDetails: {
						errors: {
							code: "3",
						},
					},
				});
				await waitFor(() => window.dispatchEvent(new Event("online")));

				expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
				expect(screen.getByLabelText(LABEL)).toBeInTheDocument();

				screen.getByTestId("input").focus();

				expect(setCurrentLocationSpy).toBeCalled();

				await waitFor(() => {
					expect(
						screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-timeout-error", "show"))
					).toBeInTheDocument();
				});

				within(screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-timeout-error", "show")))
					.getByRole("button")
					.click();

				await waitFor(() => {
					expect(
						screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-timeout-error", "show"))
					).not.toBeInTheDocument();

					expect(
						screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show"))
					).not.toBeInTheDocument();
				});

				expect(getLocationModal(false, "hide")).toBeInTheDocument();
			});

			it("should handle non app error when FE requests for current location", async () => {
				renderComponent({
					withEvents: true,
					locationDetails: {
						errors: {
							generic: "throw something",
						},
					},
				});
				await waitFor(() => window.dispatchEvent(new Event("online")));

				expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
				expect(screen.getByLabelText(LABEL)).toBeInTheDocument();

				screen.getByTestId("input").focus();

				expect(setCurrentLocationSpy).toBeCalled();

				await waitFor(() => {
					expect(
						screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show"))
					).toBeInTheDocument();
				});

				expect(
					screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-timeout-error", "show"))
				).not.toBeInTheDocument();

				within(screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show")))
					.getByRole("button")
					.click();

				await waitFor(() => {
					expect(
						screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "get-location-error", "show"))
					).not.toBeInTheDocument();
				});

				expect(screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "modal", "show"))).toBeVisible();
			});
		});

		// isLifeSGapp

		// custom error modal
		// OneMapError
		// GetLocationError
		// GetLocationTimeoutError
		// PostalCodeError
	});

	describe("functionality", () => {
		describe("when rendering the input field", () => {
			it("should be able to render the location input field", async () => {
				renderComponent();

				expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
				expect(screen.getByLabelText(LABEL)).toBeInTheDocument();
			});

			// test functionality
			describe("when there are default values", () => {
				describe("when only address", () => {
					beforeEach(async () => {
						fetchSingleLocationByAddressSpy.mockImplementation((_, onSuccess) => {
							onSuccess(mockInputValues);
						});
						reverseGeocodeSpy.mockImplementation(() => {
							return mockReverseGeoCodeResponse;
						});
						renderComponent({
							withEvents: false,
							overrideSchema: {
								defaultValues: {
									[COMPONENT_ID]: {
										address: "Fusionopolis View",
									},
								},
							},
						});

						await waitFor(() => {
							expect(getLocationInput(true)).toBeInTheDocument();
							expect(getStaticMap(true)).toBeInTheDocument();
						});
					});

					it("should open location modal when static map is clicked", async () => {
						fireEvent.click(getStaticMap());

						await waitFor(() => {
							expect(getLocationModal(true)).toBeInTheDocument();
						});
					});

					it("should open location model when location input is clicked", async () => {
						getLocationInput().focus();

						await waitFor(() => {
							expect(getLocationModal(true)).toBeInTheDocument();
						});
					});

					// FIXME reverse geocode is broken for full address searches
					describe("when location modal is open", () => {
						it.todo("should have search input field and single search result shown and selected");
					});
				});

				describe("when only lat lng", () => {
					beforeEach(async () => {
						fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
							onSuccess(mock1PageFetchAddressResponse);
						});
						fetchSingleLocationByLatLngSpy.mockImplementation(
							(_reverseGeoCodeEndpoint, _lat, _lng, handleResult) => {
								handleResult(fetchSingleLocationByLatLngSingleReponse);
							}
						);
						renderComponent({
							withEvents: false,
							overrideSchema: {
								defaultValues: {
									[COMPONENT_ID]: {
										lat: 1.29994179707526,
										lng: 103.789404349716,
									},
								},
							},
							overrideField: {
								reverseGeoCodeEndpoint: "https://www.mock.com/reverse-geo-code",
							},
						});

						await waitFor(() => {
							expect(fetchSingleLocationByLatLngSpy).toBeCalledTimes(1);
							expect(getLocationInput(true)).toBeInTheDocument();
							expect(getStaticMap(true)).toBeInTheDocument();
						});
					});

					it("should show static map only and open the modal when clicked", async () => {
						fireEvent.click(getStaticMap());

						await waitFor(() => {
							expect(getLocationModal(true)).toBeInTheDocument();
						});
					});

					it("show input value only and open the modal when clicked", async () => {
						getLocationInput().focus();

						await waitFor(() => {
							expect(getLocationModal(true)).toBeInTheDocument();
						});
					});

					describe("when location modal is open", () => {
						it.todo("should have search input field and single search result shown and selected");
					});
				});

				describe("when location is a pin location with only latlng values", () => {
					beforeEach(async () => {
						fetchSingleLocationByLatLngSpy.mockImplementation(
							(_reverseGeoCodeEndpoint, _lat, _lng, handleResult) => {
								handleResult(fetchSingleLocationByLatLngSingleReponse);
							}
						);
						renderComponent({
							withEvents: false,
							overrideSchema: {
								defaultValues: {
									[COMPONENT_ID]: {
										lat: 1.29994179707526,
										lng: 103.789404349716,
										address: "Pin location 1.30, 103.79",
									},
								},
							},
							overrideField: {
								reverseGeoCodeEndpoint: "https://www.mock.com/reverse-geo-code",
							},
						});

						await waitFor(() => {
							expect(fetchSingleLocationByLatLngSpy).toBeCalledTimes(1);
							expect(fetchSingleLocationByAddressSpy).not.toBeCalled();
							expect(getLocationInput(true)).toBeInTheDocument();
							expect(getStaticMap(true)).toBeInTheDocument();
						});
					});

					it("show input value only and open the modal when clicked", async () => {
						getLocationInput().focus();

						await waitFor(() => {
							expect(getLocationModal(true)).toBeInTheDocument();
						});
					});
				});

				describe("when both address and lat lng", () => {
					// TODO
				});

				it.todo("should show static map only and open the modal when clicked");

				it.todo("show input value only and open the modal when clicked");

				describe("when there are network errors", () => {
					it.todo("handle when static map endpoint is down");

					it.todo("handle when fetch address endpoint is down");

					it.todo("handle when reverse geocode endpoint is down");
				});

				// What other scenarios?
			});
		});

		// cancelled

		// something in state

		describe("when the location modal is open", () => {
			// what it should do
			// mobile
			// desktop

			describe("when there is internet connectivity", () => {
				it("should open location modal when input is clicked", async () => {
					renderComponent();

					expect(screen.getByTestId(COMPONENT_ID)).toBeInTheDocument();
					expect(screen.getByLabelText(LABEL)).toBeInTheDocument();

					getLocationInput().focus();

					await waitFor(() => {
						expect(getLocationModal(true)).toBeInTheDocument();
					});
				});

				describe("when geolocation is supported", () => {
					describe("when geolocation is not enabled", () => {
						it("should warn user about location not enabled and allow the user to continue after dismissing modal", async () => {
							getCurrentLocationSpy.mockRejectedValue({
								code: 1,
							});
							renderComponent();

							await waitFor(() => window.dispatchEvent(new Event("online")));

							getLocationInput().focus();

							await waitFor(() => {
								expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
							});

							within(getCurrentLocationErrorModal(true)).getByRole("button").click();

							await waitFor(() => {
								expect(getLocationPicker(true)).toBeVisible();
								expect(getLocationSearchResults(true, "double")).toBeInTheDocument();
							});
						});
					});

					describe("when geolocation is enabled", () => {
						// get current location
					});

					// geolocation state changes?
				});

				// rename
				describe("when geolocation is disabled", () => {
					beforeEach(() => {
						getCurrentLocationSpy.mockRejectedValue({
							code: 1,
						});
					});
					describe("modal controls", () => {
						describe("for tablet and below", () => {
							mockViewportForTestGroup({ width: MediaWidths.mobileL, height: MediaWidths.mobileL });

							it("should allow user to close the location modal when in map mode", async () => {
								setWindowAndViewPort(MediaWidths.mobileL);

								renderComponent();

								await waitFor(() => window.dispatchEvent(new Event("online")));

								getLocationInput().focus();

								await waitFor(() => {
									expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
								});

								within(getCurrentLocationErrorModal(true)).getByRole("button").click();

								await waitFor(() => {
									expect(getLocationModal(true)).toBeVisible();
									expect(getLocationPicker(true)).toBeVisible();
									expect(getLocationSearchResults(true, "map")).toBeInTheDocument();
								});

								fireEvent.click(getLocationCloseButton());

								await waitFor(() => {
									expect(getLocationModal(true, "hide")).toBeInTheDocument();
								});
							});

							it("should allow user to close the modal when in search mode", async () => {
								setWindowAndViewPort(MediaWidths.mobileL);

								renderComponent();

								await waitFor(() => window.dispatchEvent(new Event("online")));

								getLocationInput().focus();

								await waitFor(() => {
									expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
								});

								await waitFor(() => {
									within(getCurrentLocationErrorModal(true)).getByRole("button").click();
								});

								await waitFor(() => {
									expect(getLocationPicker(true)).toBeVisible();
									expect(getLocationSearchResults(true, "map")).toBeInTheDocument();
								});

								fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
									onSuccess(mock1PageFetchAddressResponse);
								});

								fireEvent.change(getLocationSearchInput(), { target: { value: "A" } });

								expect(fetchAddressSpy).toHaveBeenCalled();

								await waitFor(() => {
									expect(getLocationModal(true)).toBeVisible();
									expect(getLocationPicker(true, "hide")).toBeInTheDocument();
									expect(getLocationSearchResults(true, "search")).toBeInTheDocument();
								});

								fireEvent.click(getLocationCloseButton());

								await waitFor(() => {
									expect(getLocationModal(true, "hide")).toBeInTheDocument();
								});
							});
						});

						describe("for desktop", () => {
							it("should allow user to cancel", async () => {
								setWindowAndViewPort(MediaWidths.desktopL);

								renderComponent();

								await waitFor(() => window.dispatchEvent(new Event("online")));

								getLocationInput().focus();

								await waitFor(() => {
									expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
								});

								within(getCurrentLocationErrorModal(true)).getByRole("button").click();

								await waitFor(() => {
									expect(getLocationPicker(true)).toBeVisible();
									expect(getLocationSearchResults(true, "double")).toBeInTheDocument();
								});

								const buttons = screen.getAllByTestId("button");
								const [cancelButton] = buttons.filter((el) => {
									return el.textContent === "Cancel";
								});

								expect(cancelButton).toBeInTheDocument();

								cancelButton.click();

								await waitFor(() => {
									expect(getLocationModal(true)).not.toBeInTheDocument();
								});
							});
						});

						it.todo("should allow user to continue with selection");
					});

					// library so no need
					describe("map controls", () => {
						// move
						// click
						// click zoom +/-
						// click location
						// location variants
					});

					describe("when using location picker", () => {
						// map touch controls
						// zoom
						// recenter
						// click to search
					});

					describe("when using location search in desktop", () => {
						beforeEach(async () => {
							renderComponent();

							await waitFor(() => window.dispatchEvent(new Event("online")));

							getLocationInput().focus();

							await waitFor(() => {
								expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
							});

							within(getCurrentLocationErrorModal(true)).getByRole("button").click();
						});

						it("should automatically search as user types", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mockEmptyFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found nothing" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true)).toHaveTextContent("No results found");
							});

							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found something" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
							});
						});

						it("should allow user to clear query string", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found something" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
							});

							fireEvent.click(getLocationSearchClearButton());

							await waitFor(() => {
								expect(getLocationSearchInput()).toHaveValue("");
								expect(getLocationSearchResults(true)).toBeEmptyDOMElement();
							});
						});

						it("should allow user to select result", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found somthing" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
							});

							const resultContainer = getLocationSearchResults();
							const selectedResult = resultContainer.getElementsByTagName("div")[0];
							fireEvent.click(selectedResult);

							await waitFor(() => {
								expect(selectedResult).toHaveAttribute(
									"data-testid",
									expect.stringContaining("active")
								);
								expect(getLocationModalControlButtons("Confirm")).not.toHaveAttribute("disabled");
							});
						});

						it("should allow user to scroll to see more results", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found somthing" } });

							expect(fetchAddressSpy).toHaveBeenCalledTimes(1);

							await waitFor(() => {
								expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
							});

							const resultContainer = getLocationSearchResults();
							fireEvent.scroll(resultContainer, {
								target: {
									scrollTop: (resultContainer.scrollTop += 9999),
								},
							});

							act(() => {
								io.enterNode(screen.getByTestId("InfiniteScrollList__InfiniteListItem-sentryRef"));
							});

							await waitFor(() => {
								expect(fetchAddressSpy).toHaveBeenCalledTimes(2);
							});
						});

						it("should close location modal when confirm", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found somthing" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
							});

							const resultContainer = getLocationSearchResults();
							const selectedResult = resultContainer.getElementsByTagName("div")[0];
							fireEvent.click(selectedResult);

							await waitFor(() => {
								expect(selectedResult).toHaveAttribute(
									"data-testid",
									expect.stringContaining("active")
								);
								expect(getLocationModalControlButtons("Confirm")).not.toHaveAttribute("disabled");
							});

							fireEvent.click(getLocationModalControlButtons("Confirm"));

							await waitFor(() => {
								expect(getLocationModal(true)).not.toBeInTheDocument();
							});

							// should I assert static map?
						});
					});

					describe("when using location search in mobile", () => {
						beforeEach(async () => {
							setWindowAndViewPort(MediaWidths.mobileL);
							getCurrentLocationSpy.mockRejectedValue({
								code: 1,
							});
							renderComponent();

							await waitFor(() => window.dispatchEvent(new Event("online")));

							getLocationInput().focus();

							await waitFor(() => {
								expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
							});

							within(getCurrentLocationErrorModal(true)).getByRole("button").click();
						});

						it("should switch to map mode when result is selected", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found somthing" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true, "search")).not.toBeEmptyDOMElement();
							});

							const resultContainer = getLocationSearchResults(false, "search");
							const selectedResult = resultContainer.getElementsByTagName("div")[0];
							fireEvent.click(selectedResult);

							await waitFor(() => {
								expect(getLocationModal(true)).toBeVisible();
								expect(getLocationPicker(true)).toBeVisible();
								expect(getLocationSearchResults(true, "map")).toBeInTheDocument();
							});
						});

						it("should close location modal when confirm", async () => {
							fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
								onSuccess(mock1PageFetchAddressResponse);
							});

							fireEvent.change(getLocationSearchInput(), { target: { value: "found somthing" } });

							expect(fetchAddressSpy).toHaveBeenCalled();

							await waitFor(() => {
								expect(getLocationSearchResults(true, "search")).not.toBeEmptyDOMElement();
							});

							const resultContainer = getLocationSearchResults(false, "search");
							const selectedResult = resultContainer.getElementsByTagName("div")[0];
							fireEvent.click(selectedResult);

							await waitFor(() => {
								expect(selectedResult).toHaveAttribute(
									"data-testid",
									expect.stringContaining("active")
								);
								expect(getLocationModalControlButtons("Confirm location")).not.toHaveAttribute(
									"disabled"
								);
							});

							fireEvent.click(getLocationModalControlButtons("Confirm location"));

							await waitFor(() => {
								expect(getLocationModal(true)).not.toBeInTheDocument();
							});

							// should I assert static map?
						});
					});

					describe("when actions cause cross component state change", () => {
						// search behaviours?
						describe("when user click map", () => {
							// do smth
						});

						describe("when user selects a search result", () => {
							// do smth
						});

						describe("when user clears query in tablet or smaller screens", () => {
							// do smth
						});

						describe("when user recenters", () => {
							// do smth
						});
					});

					describe("when user cancels", () => {
						// restore value as untouched
						// reopen behaviour
						// as is input visual
					});

					// test screen resize?

					describe("when user continue", () => {
						it.todo("should show both static map and input value and dismiss location modal");
					});
				});
			});

			describe("when internet connectivity errors occurs", () => {
				it("should show no internet connectivity error modal if no internet", async () => {
					await renderComponent();

					await waitFor(() =>
						fireEvent.click(screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "location-input")))
					);

					await waitFor(() => window.dispatchEvent(new Event("offline")));

					expect(
						screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "no-internet-connectivity"))
					).toBeInTheDocument();
				});

				it("should dismiss the modal when internet is restored", async () => {
					await renderComponent();

					await waitFor(() =>
						fireEvent.click(screen.getByTestId(TestHelper.generateId(COMPONENT_ID, "location-input")))
					);

					await waitFor(() => window.dispatchEvent(new Event("offline")));
					await waitFor(() => window.dispatchEvent(new Event("online")));

					expect(
						screen.queryByTestId(TestHelper.generateId(COMPONENT_ID, "no-internet-connectivity"))
					).not.toBeInTheDocument();
				});

				// it("should do the custom logic when internet restores");
			});

			// TODO
			describe("network errors", () => {
				// show one map error
				// - first load useEffect
				// - query searching
				// -- getting more address when
				// 		- scrolling down to load more search results
				// showGetLocationError
				// - first load useEffect
				// - getting location
				// 		- getCurrentLocation when we click on the location modal
				//		- when clicking location button on the map
				// showGetLocationTimeoutError
				// - handleGetLocationError variance (triggered by device)
			});
		});
	});

	describe("customisation", () => {
		it.todo("should support placeholder texts");
	});

	describe("validation", () => {
		it("should allow empty if validation not required", async () => {
			renderComponent({
				withEvents: false,
			});

			await waitFor(() => fireEvent.click(getSubmitButton()));

			expect(SUBMIT_FN).toBeCalled();
		});

		describe.each`
			name                 | value
			${"empty"}           | ${{}}
			${"lat lng missing"} | ${{ address: "Fusionopolis View" }}
			${"lng missing"}     | ${{ lat: 1 }}
			${"lat missing"}     | ${{ lng: 1 }}
		`("$name", (name, value) => {
			it("should validate if required", async () => {
				renderComponent({
					validation: [{ required: true, errorMessage: ERROR_MESSAGE }],
					withEvents: false,
					overrideSchema: {
						defaultValues: {
							[COMPONENT_ID]: value,
						},
					},
				});

				await waitFor(() => fireEvent.click(getSubmitButton()));

				expect(getErrorMessage()).toBeInTheDocument();
			});
		});

		it("should pass validation if required values are provided", async () => {
			renderComponent({
				validation: [{ required: true, errorMessage: ERROR_MESSAGE }],
				withEvents: false,
				overrideSchema: {
					defaultValues: {
						[COMPONENT_ID]: {
							address: "Fusionopolis View",
							lat: 1,
							lng: 1,
						},
					},
				},
			});

			await waitFor(() => fireEvent.click(getSubmitButton()));

			expect(SUBMIT_FN).toBeCalled();
		});

		it("should validate mustHavePostalCode", async () => {
			renderComponent({
				validation: [{ required: true, errorMessage: ERROR_MESSAGE }],
				withEvents: false,
				overrideSchema: {
					defaultValues: {
						[COMPONENT_ID]: {
							address: "Fusionopolis View",
							lat: 1,
							lng: 1,
						},
					},
				},
				overrideField: {
					mustHavePostalCode: true,
				},
			});

			await waitFor(() => fireEvent.click(getSubmitButton()));

			expect(screen.getByText(ERROR_MESSAGES.LOCATION.MUST_HAVE_POSTAL_CODE)).toBeInTheDocument();
		});
	});

	describe("dirty state", () => {
		let formIsDirty: boolean;
		const handleClick = (ref: React.MutableRefObject<IFrontendEngineRef>) => {
			formIsDirty = ref.current.isDirty;
		};
		const json: IFrontendEngineData = {
			id: FRONTEND_ENGINE_ID,
			sections: {
				section: {
					uiType: "section",
					children: {
						[COMPONENT_ID]: {
							label: LABEL,
							uiType: UI_TYPE,
						},
						...getSubmitButtonProps(),
						...getResetButtonProps(),
					},
				},
			},
		};

		beforeEach(() => {
			getCurrentLocationSpy.mockRejectedValue({ code: 1 });
			fetchAddressSpy.mockImplementation((queryString, pageNumber, onSuccess) => {
				onSuccess(mock1PageFetchAddressResponse);
			});
			formIsDirty = undefined;
		});

		it("should mount without setting field state as dirty", () => {
			render(<FrontendEngineWithCustomButton data={json} onClick={handleClick} />);
			fireEvent.click(screen.getByRole("button", { name: "Custom Button" }));

			expect(formIsDirty).toBe(false);
		});

		it("should set form state as dirty if user modifies the field", async () => {
			render(<FrontendEngineWithCustomButton data={json} onClick={handleClick} />);
			await waitFor(() => window.dispatchEvent(new Event("online")));
			getLocationInput().focus();
			await waitFor(() => {
				expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
			});
			within(getCurrentLocationErrorModal(true)).getByRole("button").click();
			fireEvent.change(getLocationSearchInput(), { target: { value: "found something" } });
			await waitFor(() => {
				expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
			});
			const resultContainer = getLocationSearchResults();
			const selectedResult = resultContainer.getElementsByTagName("div")[0];
			fireEvent.click(selectedResult);
			fireEvent.click(getLocationModalControlButtons("Confirm"));
			fireEvent.click(screen.getByRole("button", { name: "Custom Button" }));

			expect(formIsDirty).toBe(true);
		});

		it("should support default value without setting form state as dirty", () => {
			render(
				<FrontendEngineWithCustomButton
					data={{
						...json,
						defaultValues: {
							[COMPONENT_ID]: {
								address: "Fusionopolis View",
							},
						},
					}}
					onClick={handleClick}
				/>
			);
			fireEvent.click(screen.getByRole("button", { name: "Custom Button" }));

			expect(formIsDirty).toBe(false);
		});

		it("should reset and revert form dirty state to false", async () => {
			render(<FrontendEngineWithCustomButton data={json} onClick={handleClick} />);
			await waitFor(() => window.dispatchEvent(new Event("online")));
			getLocationInput().focus();
			await waitFor(() => {
				expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
			});
			within(getCurrentLocationErrorModal(true)).getByRole("button").click();
			fireEvent.change(getLocationSearchInput(), { target: { value: "found something" } });
			await waitFor(() => {
				expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
			});
			const resultContainer = getLocationSearchResults();
			const selectedResult = resultContainer.getElementsByTagName("div")[0];
			fireEvent.click(selectedResult);
			fireEvent.click(getLocationModalControlButtons("Confirm"));

			fireEvent.click(getResetButton());
			fireEvent.click(screen.getByRole("button", { name: "Custom Button" }));

			expect(formIsDirty).toBe(false);
		});

		it("should reset to default value without setting form state as dirty", async () => {
			render(
				<FrontendEngineWithCustomButton
					data={{
						...json,
						defaultValues: {
							[COMPONENT_ID]: {
								address: "Fusionopolis View",
							},
						},
					}}
					onClick={handleClick}
				/>
			);
			await waitFor(() => window.dispatchEvent(new Event("online")));
			getLocationInput().focus();
			await waitFor(() => {
				expect(getCurrentLocationErrorModal(true)).toBeInTheDocument();
			});
			within(getCurrentLocationErrorModal(true)).getByRole("button").click();
			fireEvent.change(getLocationSearchInput(), { target: { value: "found something" } });
			await waitFor(() => {
				expect(getLocationSearchResults(true)).not.toBeEmptyDOMElement();
			});
			const resultContainer = getLocationSearchResults();
			const selectedResult = resultContainer.getElementsByTagName("div")[0];
			fireEvent.click(selectedResult);
			fireEvent.click(getLocationModalControlButtons("Confirm"));

			fireEvent.click(getResetButton());
			fireEvent.click(screen.getByRole("button", { name: "Custom Button" }));

			expect(formIsDirty).toBe(false);
		});
	});
});
