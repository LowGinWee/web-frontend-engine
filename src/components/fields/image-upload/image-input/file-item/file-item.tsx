import { Text } from "@lifesg/react-design-system/text";
import { CrossIcon } from "@lifesg/react-icons/cross";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileHelper, TestHelper } from "../../../../../utils";
import { ERROR_MESSAGES } from "../../../../shared";
import { EImageStatus, IImage, IImageUploadValidationRule, ISharedImageProps } from "../../types";
import {
	CellDeleteButton,
	CellFileSize,
	CellInfo,
	CellProgressBar,
	DeleteButton,
	DesktopTextBodyDetail,
	ErrorCustomMutedThumbnailContainer,
	ErrorText,
	FileNameWrapper,
	MobileTextBodyDetail,
	ProgressBar,
	TextBody,
	Thumbnail,
	Wrapper,
} from "./file-item.styles";

interface IProps extends Omit<ISharedImageProps, "maxFiles"> {
	id?: string;
	index: number;
	fileItem: IImage;
	validation: IImageUploadValidationRule[];
	onDelete: (index: number) => (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const FileItem = ({ id = "file-item", index, fileItem, maxSizeInKb, accepts, onDelete, validation }: IProps) => {
	// =============================================================================
	// CONST, STATE, REFS
	// =============================================================================
	const { dataURL, file, name: fileName, status, uploadProgress } = fileItem;
	const [isError, setError] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const fileNameWrapperRef = useRef<HTMLDivElement>(null);
	const [transformedFileName, setTransformedFileName] = useState<string>();
	// =============================================================================
	// HELPER FUNCTIONS
	// =============================================================================
	const setFileNameToWidth = useCallback(() => {
		const transformed = FileHelper.truncateFileName(fileName, fileNameWrapperRef);
		setTransformedFileName(transformed);
	}, [fileName]);

	// =============================================================================
	// EFFECTS
	// =============================================================================
	useEffect(() => {
		const handleResize = () => {
			if (fileNameWrapperRef.current) {
				setFileNameToWidth();
			}
		};

		const resizeObserver = new ResizeObserver(handleResize);
		const currentElement = fileNameWrapperRef.current;

		if (currentElement) {
			resizeObserver.observe(currentElement);
			setFileNameToWidth();
		}

		return () => {
			if (currentElement) {
				resizeObserver.unobserve(currentElement);
			}
		};
	}, [fileNameWrapperRef, setFileNameToWidth]);

	useEffect(() => {
		switch (status) {
			case EImageStatus.ERROR_FORMAT: {
				const fileTypeRule = validation?.find((rule) => "fileType" in rule);
				const _errorMessage = fileTypeRule?.errorMessage || ERROR_MESSAGES.UPLOAD("photo").FILE_TYPE(accepts);
				setError(true);
				setErrorMessage(_errorMessage);
				break;
			}
			case EImageStatus.ERROR_GENERIC: {
				const uploadRule = validation?.find((rule) => "upload" in rule);
				const _errorMessage = uploadRule?.errorMessage || ERROR_MESSAGES.UPLOAD("photo").GENERIC;
				setError(true);
				setErrorMessage(_errorMessage);
				break;
			}
			case EImageStatus.ERROR_SIZE: {
				const fileSizeRule = validation?.find((rule) => "maxSizeInKb" in rule);
				const _errorMessage =
					fileSizeRule?.errorMessage || ERROR_MESSAGES.UPLOAD("photo").MAX_FILE_SIZE(maxSizeInKb);
				setError(true);
				setErrorMessage(_errorMessage);
				break;
			}
			case EImageStatus.ERROR_CUSTOM: {
				const _errorMessage = fileItem.customErrorMessage;
				setError(true);
				setErrorMessage(_errorMessage);
				break;
			}
			case EImageStatus.ERROR_CUSTOM_MUTED: {
				const _errorMessage = fileItem.customErrorMessage;
				setError(false);
				setErrorMessage(_errorMessage);
				break;
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, dataURL, file.type, maxSizeInKb]);

	// =============================================================================
	// RENDER FUNCTIONS
	// =============================================================================
	const fileSize = `${Math.round(
		FileHelper.getFilesizeFromBase64(fileItem.drawingDataURL || fileItem.dataURL || "") / 1000
	)} KB`;

	const renderError = () =>
		(isError || status === EImageStatus.ERROR_CUSTOM_MUTED) && (
			<ErrorText
				weight={"semibold"}
				id={TestHelper.generateId(`${id}-${index + 1}`, "error-text")}
				data-testid={TestHelper.generateId(`${id}-${index + 1}`, "error-text")}
			>
				{errorMessage}
			</ErrorText>
		);

	/**
	 * render progress bar or delete button
	 * - progress bar: no error or status = compressed / converted / uploading
	 * - delete button: got error or file is ready
	 */
	const renderDetails = () => {
		const renderProgressBar =
			!isError && [EImageStatus.COMPRESSED, EImageStatus.CONVERTED, EImageStatus.UPLOADING].includes(status);

		return renderProgressBar ? (
			<CellProgressBar>
				<ProgressBar value={uploadProgress} max={100} />
			</CellProgressBar>
		) : (
			<CellDeleteButton>
				<DeleteButton
					onClick={onDelete(index)}
					id={TestHelper.generateId(`${id}-${index + 1}`, "btn-delete")}
					data-testid={TestHelper.generateId(`${id}-${index + 1}`, "btn-delete")}
					aria-label={`remove ${fileName}`}
				>
					<CrossIcon />
				</DeleteButton>
			</CellDeleteButton>
		);
	};

	const renderCellInfoDetails = () => {
		return status === EImageStatus.ERROR_CUSTOM_MUTED ? (
			<>
				<ErrorCustomMutedThumbnailContainer>
					<Thumbnail
						src={fileItem.dataURL ?? ""}
						id={TestHelper.generateId(`${id}-${index + 1}`, "image")}
						data-testid={TestHelper.generateId(`${id}-${index + 1}`, "image")}
					/>
					<TextBody
						as="div"
						id={TestHelper.generateId(`${id}-${index + 1}`, "file-image")}
						data-testid={TestHelper.generateId(`${id}-${index + 1}`, "file-image")}
					>
						<FileNameWrapper ref={fileNameWrapperRef}>{transformedFileName}</FileNameWrapper>
						<DesktopTextBodyDetail>{renderError()}</DesktopTextBodyDetail>
						<MobileTextBodyDetail>{fileSize}</MobileTextBodyDetail>
					</TextBody>
				</ErrorCustomMutedThumbnailContainer>
				<TextBody
					as="div"
					id={TestHelper.generateId(`${id}-${index + 1}`, "file-error")}
					data-testid={TestHelper.generateId(`${id}-${index + 1}`, "file-error")}
				>
					<MobileTextBodyDetail>{renderError()}</MobileTextBodyDetail>
				</TextBody>
			</>
		) : (
			<>
				{status === EImageStatus.UPLOADED && !isError && (
					<Thumbnail
						src={fileItem.dataURL ?? ""}
						id={TestHelper.generateId(`${id}-${index + 1}`, "image")}
						data-testid={TestHelper.generateId(`${id}-${index + 1}`, "image")}
					/>
				)}
				<TextBody
					as="div"
					id={TestHelper.generateId(`${id}-${index + 1}`, "file-image")}
					data-testid={TestHelper.generateId(`${id}-${index + 1}`, "file-image")}
				>
					<FileNameWrapper ref={fileNameWrapperRef}>{transformedFileName}</FileNameWrapper>
					{renderError()}
					<MobileTextBodyDetail>{fileSize}</MobileTextBodyDetail>
				</TextBody>
			</>
		);
	};

	return (
		<Wrapper
			isError={isError}
			isCustomMuted={status === EImageStatus.ERROR_CUSTOM_MUTED}
			id={TestHelper.generateId(`${id}-${index + 1}`)}
			data-testid={TestHelper.generateId(`${id}-${index + 1}`)}
		>
			<>
				<CellInfo>{renderCellInfoDetails()}</CellInfo>
				<CellFileSize>
					<Text.Body
						id={TestHelper.generateId(`${id}-${index + 1}`, "file-size")}
						data-testid={TestHelper.generateId(`${id}-${index + 1}`, "file-size")}
					>
						{fileSize}
					</Text.Body>
				</CellFileSize>
				{renderDetails()}
			</>
		</Wrapper>
	);
};
