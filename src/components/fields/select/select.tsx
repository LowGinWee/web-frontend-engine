import { Form } from "@lifesg/react-design-system/form";
import { InputSelect } from "@lifesg/react-design-system/input-select";
import find from "lodash/find";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import { ObjectHelper, TestHelper } from "../../../utils";
import { useValidationSchema } from "../../../utils/hooks";
import { IGenericFieldProps } from "../../frontend-engine";
import { ISelectOption, ISelectSchema } from "./types";

export const Select = (props: IGenericFieldProps<ISelectSchema>) => {
	// =============================================================================
	// CONST, STATE, REFS
	// =============================================================================
	const {
		schema: { label, validation, options, ...otherSchema },
		id,
		name,
		value,
		error,
		onChange,
	} = props;

	const [stateValue, setStateValue] = useState<string>(value || "");
	const { setFieldValidationConfig } = useValidationSchema();

	// =============================================================================
	// EFFECTS
	// =============================================================================
	useEffect(() => {
		setFieldValidationConfig(id, Yup.string(), validation);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [validation]);

	useEffect(() => {
		if (value) {
			handleChange(value);
		}
	}, []);

	// =============================================================================
	// HELPER FUNCTIONS
	// =============================================================================
	const getSelectOption = (): ISelectOption => {
		return find(options as ISelectOption[], { label: stateValue });
	};

	// =============================================================================
	// EVENT HANDLERS
	// =============================================================================
	const handleChange = (option: ISelectOption | string): void => {
		if (ObjectHelper.containsKey(option, "value")) {
			setStateValue(option.value);
			onChange({ target: { value: option.value } });
		} else {
			setStateValue(option);
			onChange({ target: { value: option } });
		}
	};

	return (
		<Form.CustomField id={id} label={label} errorMessage={error?.message}>
			<InputSelect
				{...otherSchema}
				id={TestHelper.generateId(id, "select")}
				name={name}
				options={options}
				onSelectOption={handleChange}
				selectedOption={getSelectOption()}
				valueExtractor={(item: ISelectOption) => item.value}
				listExtractor={(item: ISelectOption) => item.label}
			/>
		</Form.CustomField>
	);
};
