import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ITextFieldSchema } from "../../../../components/fields";
import { FrontendEngine, IFrontendEngineData } from "../../../../components/frontend-engine";
import {
	ERROR_MESSAGE,
	FRONTEND_ENGINE_ID,
	TOverrideField,
	TOverrideSchema,
	getField,
	getSubmitButton,
	getSubmitButtonProps,
} from "../../../common";
import { IFilterItemSchema } from "../../../../components/custom/filter/filter-item/types";
const { ResizeObserver } = window;

const SUBMIT_FN = jest.fn();
const COMPONENT_ID = "field";
const REFERENCE_KEY = "filter-item";
const TEXTFIELD_LABEL = "Name";
const renderComponent = (
	overrideField?: TOverrideField<ITextFieldSchema>,
	overrideFilterItem?: TOverrideField<IFilterItemSchema>,
	overrideSchema?: TOverrideSchema
) => {
	const json: IFrontendEngineData = {
		id: FRONTEND_ENGINE_ID,
		sections: {
			section: {
				uiType: "section",
				children: {
					filter: {
						referenceKey: "filter",
						label: "Filter",
						children: {
							filterItem1: {
								referenceKey: REFERENCE_KEY,
								label: "Filter Item",
								...overrideFilterItem,
								children: {
									[COMPONENT_ID]: {
										uiType: "text-field",
										label: TEXTFIELD_LABEL,
										...overrideField,
									},
								},
							},
							...getSubmitButtonProps(),
						},
					},
				},
			},
		},
		...overrideSchema,
	};
	return render(<FrontendEngine data={json} onSubmit={SUBMIT_FN} />);
};

const getTextfield = (): HTMLElement => {
	return getField("textbox", TEXTFIELD_LABEL);
};
// TODO: Add more tests
describe(REFERENCE_KEY, () => {
	beforeEach(() => {
		jest.resetAllMocks();
		delete window.ResizeObserver;
		window.ResizeObserver = jest.fn().mockImplementation(() => ({
			observe: jest.fn(),
			unobserve: jest.fn(),
			disconnect: jest.fn(),
		}));
	});

	afterEach(() => {
		window.ResizeObserver = ResizeObserver;
		jest.restoreAllMocks();
	});

	it("should be able to render text field", () => {
		renderComponent();
	});

	it("should support default value", async () => {
		const defaultValue = "John Doe";
		renderComponent(undefined, undefined, { defaultValues: { [COMPONENT_ID]: defaultValue } });
		// switching to use get all by display value, as filter-item will render two fields for desktop and mobile
		expect(screen.getAllByDisplayValue(defaultValue)[0]).toBeInTheDocument();

		await waitFor(() => fireEvent.click(getSubmitButton()));
		expect(SUBMIT_FN).toBeCalledWith(expect.objectContaining({ [COMPONENT_ID]: defaultValue }));
	});

	it("should pass other props into the field", () => {
		renderComponent({
			placeholder: "placeholder",
			readOnly: true,
			disabled: true,
		});

		expect(getTextfield()).toHaveAttribute("placeholder", "placeholder");
		expect(getTextfield()).toHaveAttribute("readonly");
		expect(getTextfield()).toBeDisabled();
	});

	it("should support validation schema", async () => {
		renderComponent({ validation: [{ required: true, errorMessage: ERROR_MESSAGE }] });

		await waitFor(() => fireEvent.click(getSubmitButton()));

		expect(screen.getAllByText(ERROR_MESSAGE)[0]).toBeInTheDocument();
	});

	describe("clear behaviour on clicking clear button in filter", () => {
		const defaultValue = "John Doe";
		const changedValue = "Hello world";

		it.each`
			scenario                                             | clearBehavior | expectedValue
			${"clear values by default"}                         | ${null}       | ${""}
			${"clear values if clearBehavior=clear"}             | ${"clear"}    | ${""}
			${"revert to default value if clearBehavior=revert"} | ${"revert"}   | ${defaultValue}
			${"not update value if clearBehavior=retain"}        | ${"retain"}   | ${changedValue}
		`("it should $scenario", async ({ clearBehavior, expectedValue }) => {
			renderComponent(undefined, { clearBehavior }, { defaultValues: { [COMPONENT_ID]: defaultValue } });
			fireEvent.change(screen.getByLabelText(TEXTFIELD_LABEL), { target: { value: changedValue } });
			await waitFor(() => fireEvent.click(screen.getByRole("button", { name: "Clear" })));

			expect(getTextfield()).toHaveValue(expectedValue);
		});
	});
});
