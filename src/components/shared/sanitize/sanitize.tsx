import { Markup, MarkupProps } from "@lifesg/react-design-system/markup";
import { renderToStaticMarkup } from "react-dom/server";
import sanitize, { IOptions } from "sanitize-html";
import { TestHelper } from "../../../utils";
import { useFormSchema } from "../../../utils/hooks";

interface IProps {
	baseTextColor?: MarkupProps["baseTextColor"] | undefined;
	baseTextSize?: MarkupProps["baseTextSize"] | undefined;
	children: string | React.ReactNode;
	className?: string | undefined;
	id?: string | undefined;
	inline?: boolean | undefined;
	sanitizeOptions?: IOptions;
}

export const Sanitize = (props: IProps) => {
	// =============================================================================
	// CONST, STATE, REF
	// =============================================================================
	const { baseTextColor, baseTextSize, children, className, id, inline, sanitizeOptions } = props;
	const {
		formSchema: { defaultValues },
	} = useFormSchema();

	// =============================================================================
	// HELPER FUNCTIONS
	// =============================================================================
	const formatHTMLString = (): string => {
		if (typeof children !== "string") {
			return renderToStaticMarkup(children as JSX.Element);
		}
		return replaceDefaultValue(children);
	};

	/**
	 * Replaces the key within <value> tags with corresponding default values defined in the FEE schema.
	 * If a match is found, the content is replaced by the value. If no match is found, the key and tag would be removed.
	 * @param body The children string content containing the <value> tags
	 */
	const replaceDefaultValue = (body: string): string => {
		if (typeof body === "string") {
			return body.replace(/<value>(.*?)<\/value>/g, (_, id) => {
				return defaultValues?.[id] || "";
			});
		}
		return body;
	};

	const getSanitizedHtml = (): string => {
		return sanitize(formatHTMLString(), sanitizeOptions);
	};

	const formatId = (): string => {
		if (id) {
			return TestHelper.generateId(id, "sanitized");
		}
		return TestHelper.generateId("sanitized");
	};

	// =============================================================================
	// RENDER FUNCTIONS
	// =============================================================================
	return (
		<Markup
			baseTextColor={baseTextColor}
			baseTextSize={baseTextSize}
			inline={inline}
			id={formatId()}
			className={className}
			data-testid={formatId()}
			dangerouslySetInnerHTML={{ __html: getSanitizedHtml() }}
		/>
	);
};
