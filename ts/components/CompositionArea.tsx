// Copyright 2019 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { get } from 'lodash';
import classNames from 'classnames';
import type {
  DraftBodyRangesType,
  LocalizerType,
  ThemeType,
} from '../types/Util';
import type { ErrorDialogAudioRecorderType } from '../types/AudioRecorder';
import { RecordingState } from '../types/AudioRecorder';
import type { imageToBlurHash } from '../util/imageToBlurHash';
import { Spinner } from './Spinner';
import type {
  Props as EmojiButtonProps,
  EmojiButtonAPI,
} from './emoji/EmojiButton';
import { EmojiButton } from './emoji/EmojiButton';
import type { Props as StickerButtonProps } from './stickers/StickerButton';
import { StickerButton } from './stickers/StickerButton';
import type {
  InputApi,
  Props as CompositionInputProps,
} from './CompositionInput';
import { CompositionInput } from './CompositionInput';
import type { Props as MessageRequestActionsProps } from './conversation/MessageRequestActions';
import { MessageRequestActions } from './conversation/MessageRequestActions';
import type { PropsType as GroupV1DisabledActionsPropsType } from './conversation/GroupV1DisabledActions';
import { GroupV1DisabledActions } from './conversation/GroupV1DisabledActions';
import type { PropsType as GroupV2PendingApprovalActionsPropsType } from './conversation/GroupV2PendingApprovalActions';
import { GroupV2PendingApprovalActions } from './conversation/GroupV2PendingApprovalActions';
import { AnnouncementsOnlyGroupBanner } from './AnnouncementsOnlyGroupBanner';
import { AttachmentList } from './conversation/AttachmentList';
import type {
  AttachmentDraftType,
  InMemoryAttachmentDraftType,
} from '../types/Attachment';
import { isImageAttachment, isVoiceMessage } from '../types/Attachment';
import { AudioCapture } from './conversation/AudioCapture';
import { CompositionUpload } from './CompositionUpload';
import type {
  ConversationType,
  PushPanelForConversationActionType,
  ShowConversationType,
} from '../state/ducks/conversations';
import type { EmojiPickDataType } from './emoji/EmojiPicker';
import type { LinkPreviewType } from '../types/message/LinkPreviews';

import { MandatoryProfileSharingActions } from './conversation/MandatoryProfileSharingActions';
import { MediaQualitySelector } from './MediaQualitySelector';
import type { Props as QuoteProps } from './conversation/Quote';
import { Quote } from './conversation/Quote';
import { countStickers } from './stickers/lib';
import {
  useAttachFileShortcut,
  useKeyboardShortcuts,
} from '../hooks/useKeyboardShortcuts';
import { MediaEditor } from './MediaEditor';
import { isImageTypeSupported } from '../util/GoogleChrome';
import * as KeyboardLayout from '../services/keyboardLayout';
import { usePrevious } from '../hooks/usePrevious';
import { PanelType } from '../types/Panels';
import type { SmartCompositionRecordingDraftProps } from '../state/smart/CompositionRecordingDraft';
import { useEscapeHandling } from '../hooks/useEscapeHandling';
import type { SmartCompositionRecordingProps } from '../state/smart/CompositionRecording';

export type OwnProps = Readonly<{
  acceptedMessageRequest?: boolean;
  addAttachment: (
    conversationId: string,
    attachment: InMemoryAttachmentDraftType
  ) => unknown;
  announcementsOnly?: boolean;
  areWeAdmin?: boolean;
  areWePending?: boolean;
  areWePendingApproval?: boolean;
  cancelRecording: () => unknown;
  completeRecording: (
    conversationId: string,
    onRecordingComplete: (rec: InMemoryAttachmentDraftType) => unknown
  ) => unknown;
  conversationId: string;
  uuid?: string;
  draftAttachments: ReadonlyArray<AttachmentDraftType>;
  errorDialogAudioRecorderType?: ErrorDialogAudioRecorderType;
  errorRecording: (e: ErrorDialogAudioRecorderType) => unknown;
  focusCounter: number;
  groupAdmins: Array<ConversationType>;
  groupVersion?: 1 | 2;
  i18n: LocalizerType;
  imageToBlurHash: typeof imageToBlurHash;
  isDisabled: boolean;
  isFetchingUUID?: boolean;
  isGroupV1AndDisabled?: boolean;
  isMissingMandatoryProfileSharing?: boolean;
  isSignalConversation?: boolean;
  recordingState: RecordingState;
  messageCompositionId: string;
  isSMSOnly?: boolean;
  left?: boolean;
  linkPreviewLoading: boolean;
  linkPreviewResult?: LinkPreviewType;
  messageRequestsEnabled?: boolean;
  onClearAttachments(conversationId: string): unknown;
  onCloseLinkPreview(conversationId: string): unknown;
  processAttachments: (options: {
    conversationId: string;
    files: ReadonlyArray<File>;
  }) => unknown;
  setMediaQualitySetting(conversationId: string, isHQ: boolean): unknown;
  sendStickerMessage(
    id: string,
    opts: { packId: string; stickerId: number }
  ): unknown;
  sendMultiMediaMessage(
    conversationId: string,
    options: {
      draftAttachments?: ReadonlyArray<AttachmentDraftType>;
      mentions?: DraftBodyRangesType;
      message?: string;
      timestamp?: number;
      voiceNoteAttachment?: InMemoryAttachmentDraftType;
    }
  ): unknown;
  quotedMessageId?: string;
  quotedMessageProps?: Omit<
    QuoteProps,
    'i18n' | 'onClick' | 'onClose' | 'withContentAbove'
  >;
  removeAttachment: (conversationId: string, filePath: string) => unknown;
  scrollToMessage: (conversationId: string, messageId: string) => unknown;
  setComposerFocus: (conversationId: string) => unknown;
  setQuoteByMessageId(
    conversationId: string,
    messageId: string | undefined
  ): unknown;
  shouldSendHighQualityAttachments: boolean;
  showConversation: ShowConversationType;
  startRecording: (id: string) => unknown;
  theme: ThemeType;
  renderSmartCompositionRecording: (
    props: SmartCompositionRecordingProps
  ) => JSX.Element;
  renderSmartCompositionRecordingDraft: (
    props: SmartCompositionRecordingDraftProps
  ) => JSX.Element | null;
}>;

export type Props = Pick<
  CompositionInputProps,
  | 'sortedGroupMembers'
  | 'onEditorStateChange'
  | 'onTextTooLong'
  | 'draftText'
  | 'draftBodyRanges'
  | 'clearQuotedMessage'
  | 'getPreferredBadge'
  | 'getQuotedMessage'
> &
  Pick<
    EmojiButtonProps,
    'onPickEmoji' | 'onSetSkinTone' | 'recentEmojis' | 'skinTone'
  > &
  Pick<
    StickerButtonProps,
    | 'knownPacks'
    | 'receivedPacks'
    | 'installedPack'
    | 'installedPacks'
    | 'blessedPacks'
    | 'recentStickers'
    | 'clearInstalledStickerPack'
    | 'clearShowIntroduction'
    | 'showPickerHint'
    | 'clearShowPickerHint'
  > &
  MessageRequestActionsProps &
  Pick<GroupV1DisabledActionsPropsType, 'showGV2MigrationDialog'> &
  Pick<GroupV2PendingApprovalActionsPropsType, 'cancelJoinRequest'> & {
    pushPanelForConversation: PushPanelForConversationActionType;
  } & OwnProps;

export function CompositionArea({
  // Base props
  addAttachment,
  conversationId,
  focusCounter,
  i18n,
  imageToBlurHash,
  isDisabled,
  isSignalConversation,
  messageCompositionId,
  pushPanelForConversation,
  processAttachments,
  removeAttachment,
  sendMultiMediaMessage,
  setComposerFocus,
  setQuoteByMessageId,
  theme,

  // AttachmentList
  draftAttachments,
  onClearAttachments,
  // AudioCapture
  recordingState,
  startRecording,
  // StagedLinkPreview
  linkPreviewLoading,
  linkPreviewResult,
  onCloseLinkPreview,
  // Quote
  quotedMessageId,
  quotedMessageProps,
  scrollToMessage,
  // MediaQualitySelector
  setMediaQualitySetting,
  shouldSendHighQualityAttachments,
  // CompositionInput
  onEditorStateChange,
  onTextTooLong,
  draftText,
  draftBodyRanges,
  clearQuotedMessage,
  getPreferredBadge,
  getQuotedMessage,
  sortedGroupMembers,
  // EmojiButton
  onPickEmoji,
  onSetSkinTone,
  recentEmojis,
  skinTone,
  // StickerButton
  knownPacks,
  receivedPacks,
  installedPack,
  installedPacks,
  blessedPacks,
  recentStickers,
  clearInstalledStickerPack,
  sendStickerMessage,
  clearShowIntroduction,
  showPickerHint,
  clearShowPickerHint,
  // Message Requests
  acceptedMessageRequest,
  areWePending,
  areWePendingApproval,
  conversationType,
  groupVersion,
  isBlocked,
  isMissingMandatoryProfileSharing,
  left,
  messageRequestsEnabled,
  acceptConversation,
  blockConversation,
  blockAndReportSpam,
  deleteConversation,
  title,
  // GroupV1 Disabled Actions
  isGroupV1AndDisabled,
  showGV2MigrationDialog,
  // GroupV2
  announcementsOnly,
  areWeAdmin,
  groupAdmins,
  cancelJoinRequest,
  showConversation,
  // SMS-only contacts
  isSMSOnly,
  isFetchingUUID,
  renderSmartCompositionRecording,
  renderSmartCompositionRecordingDraft,
}: Props): JSX.Element | null {
  const [dirty, setDirty] = useState(false);
  const [large, setLarge] = useState(false);
  const [attachmentToEdit, setAttachmentToEdit] = useState<
    AttachmentDraftType | undefined
  >();
  const inputApiRef = useRef<InputApi | undefined>();
  const emojiButtonRef = useRef<EmojiButtonAPI | undefined>();
  const fileInputRef = useRef<null | HTMLInputElement>(null);

  const handleForceSend = useCallback(() => {
    setLarge(false);
    if (inputApiRef.current) {
      inputApiRef.current.submit();
    }
  }, [inputApiRef, setLarge]);

  const handleSubmit = useCallback(
    (message: string, mentions: DraftBodyRangesType, timestamp: number) => {
      emojiButtonRef.current?.close();
      sendMultiMediaMessage(conversationId, {
        draftAttachments,
        mentions,
        message,
        timestamp,
      });
      setLarge(false);
    },
    [conversationId, draftAttachments, sendMultiMediaMessage, setLarge]
  );

  const launchAttachmentPicker = useCallback(() => {
    const fileInput = fileInputRef.current;
    if (fileInput) {
      // Setting the value to empty so that onChange always fires in case
      // you add multiple photos.
      fileInput.value = '';
      fileInput.click();
    }
  }, []);

  function maybeEditAttachment(attachment: AttachmentDraftType) {
    if (!isImageTypeSupported(attachment.contentType)) {
      return;
    }

    setAttachmentToEdit(attachment);
  }

  const attachFileShortcut = useAttachFileShortcut(launchAttachmentPicker);
  useKeyboardShortcuts(attachFileShortcut);

  // Focus input on first mount
  const previousFocusCounter = usePrevious<number | undefined>(
    focusCounter,
    focusCounter
  );
  useEffect(() => {
    if (inputApiRef.current) {
      inputApiRef.current.focus();
    }
  }, []);
  // Focus input whenever explicitly requested
  useEffect(() => {
    if (focusCounter !== previousFocusCounter && inputApiRef.current) {
      inputApiRef.current.focus();
    }
  }, [inputApiRef, focusCounter, previousFocusCounter]);

  const withStickers =
    countStickers({
      knownPacks,
      blessedPacks,
      installedPacks,
      receivedPacks,
    }) > 0;

  const previousMessageCompositionId = usePrevious(
    messageCompositionId,
    messageCompositionId
  );
  useEffect(() => {
    if (!inputApiRef.current) {
      return;
    }
    if (previousMessageCompositionId !== messageCompositionId) {
      inputApiRef.current.reset();
    }
  }, [messageCompositionId, previousMessageCompositionId]);

  const insertEmoji = useCallback(
    (e: EmojiPickDataType) => {
      if (inputApiRef.current) {
        inputApiRef.current.insertEmoji(e);
        onPickEmoji(e);
      }
    },
    [inputApiRef, onPickEmoji]
  );

  const previousConversationId = usePrevious(conversationId, conversationId);
  useEffect(() => {
    if (!draftText) {
      inputApiRef.current?.setContents('');
      return;
    }

    if (conversationId === previousConversationId) {
      return;
    }

    inputApiRef.current?.setContents(draftText, draftBodyRanges, true);
  }, [conversationId, draftBodyRanges, draftText, previousConversationId]);

  const handleToggleLarge = useCallback(() => {
    setLarge(l => !l);
  }, [setLarge]);

  const shouldShowMicrophone = !large && !draftAttachments.length && !draftText;

  const showMediaQualitySelector = draftAttachments.some(isImageAttachment);

  const leftHandSideButtonsFragment = (
    <>
      <div className="CompositionArea__button-cell">
        <EmojiButton
          emojiButtonApi={emojiButtonRef}
          i18n={i18n}
          doSend={handleForceSend}
          onPickEmoji={insertEmoji}
          onClose={() => setComposerFocus(conversationId)}
          recentEmojis={recentEmojis}
          skinTone={skinTone}
          onSetSkinTone={onSetSkinTone}
        />
      </div>
      {showMediaQualitySelector ? (
        <div className="CompositionArea__button-cell">
          <MediaQualitySelector
            conversationId={conversationId}
            i18n={i18n}
            isHighQuality={shouldSendHighQualityAttachments}
            onSelectQuality={setMediaQualitySetting}
          />
        </div>
      ) : null}
    </>
  );

  const micButtonFragment = shouldShowMicrophone ? (
    <div className="CompositionArea__button-cell">
      <AudioCapture
        conversationId={conversationId}
        draftAttachments={draftAttachments}
        i18n={i18n}
        startRecording={startRecording}
      />
    </div>
  ) : null;

  const isRecording = recordingState === RecordingState.Recording;
  const attButton =
    linkPreviewResult || isRecording ? undefined : (
      <div className="CompositionArea__button-cell">
        <button
          type="button"
          className="CompositionArea__attach-file"
          onClick={launchAttachmentPicker}
          aria-label={i18n('CompositionArea--attach-file')}
        />
      </div>
    );

  const sendButtonFragment = (
    <>
      <div className="CompositionArea__placeholder" />
      <div className="CompositionArea__button-cell">
        <button
          type="button"
          className="CompositionArea__send-button"
          onClick={handleForceSend}
          aria-label={i18n('sendMessageToContact')}
        />
      </div>
    </>
  );

  const stickerButtonPlacement = large ? 'top-start' : 'top-end';
  const stickerButtonFragment = withStickers ? (
    <div className="CompositionArea__button-cell">
      <StickerButton
        i18n={i18n}
        knownPacks={knownPacks}
        receivedPacks={receivedPacks}
        installedPack={installedPack}
        installedPacks={installedPacks}
        blessedPacks={blessedPacks}
        recentStickers={recentStickers}
        clearInstalledStickerPack={clearInstalledStickerPack}
        onClickAddPack={() =>
          pushPanelForConversation({
            type: PanelType.StickerManager,
          })
        }
        onPickSticker={(packId, stickerId) =>
          sendStickerMessage(conversationId, { packId, stickerId })
        }
        clearShowIntroduction={clearShowIntroduction}
        showPickerHint={showPickerHint}
        clearShowPickerHint={clearShowPickerHint}
        position={stickerButtonPlacement}
      />
    </div>
  ) : null;

  // Listen for cmd/ctrl-shift-x to toggle large composition mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { shiftKey, ctrlKey, metaKey } = e;
      const key = KeyboardLayout.lookup(e);
      // When using the ctrl key, `key` is `'X'`. When using the cmd key, `key` is `'x'`
      const xKey = key === 'x' || key === 'X';
      const commandKey = get(window, 'platform') === 'darwin' && metaKey;
      const controlKey = get(window, 'platform') !== 'darwin' && ctrlKey;
      const commandOrCtrl = commandKey || controlKey;

      // cmd/ctrl-shift-x
      if (xKey && shiftKey && commandOrCtrl) {
        e.preventDefault();
        setLarge(x => !x);
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [setLarge]);

  const handleRecordingBeforeSend = useCallback(() => {
    emojiButtonRef.current?.close();
  }, [emojiButtonRef]);

  const clearQuote = useCallback(() => {
    if (quotedMessageId) {
      setQuoteByMessageId(conversationId, undefined);
    }
  }, [conversationId, quotedMessageId, setQuoteByMessageId]);

  useEscapeHandling(clearQuote);

  if (isSignalConversation) {
    // TODO DESKTOP-4547
    return <div />;
  }

  if (
    isBlocked ||
    areWePending ||
    (messageRequestsEnabled && !acceptedMessageRequest)
  ) {
    return (
      <MessageRequestActions
        acceptConversation={acceptConversation}
        blockAndReportSpam={blockAndReportSpam}
        blockConversation={blockConversation}
        conversationId={conversationId}
        conversationType={conversationType}
        deleteConversation={deleteConversation}
        i18n={i18n}
        isBlocked={isBlocked}
        title={title}
      />
    );
  }

  if (conversationType === 'direct' && isSMSOnly) {
    return (
      <div
        className={classNames([
          'CompositionArea',
          'CompositionArea--sms-only',
          isFetchingUUID ? 'CompositionArea--pending' : null,
        ])}
      >
        {isFetchingUUID ? (
          <Spinner
            ariaLabel={i18n('CompositionArea--sms-only__spinner-label')}
            role="presentation"
            moduleClassName="module-image-spinner"
            svgSize="small"
          />
        ) : (
          <>
            <h2 className="CompositionArea--sms-only__title">
              {i18n('CompositionArea--sms-only__title')}
            </h2>
            <p className="CompositionArea--sms-only__body">
              {i18n('CompositionArea--sms-only__body')}
            </p>
          </>
        )}
      </div>
    );
  }

  // If no message request, but we haven't shared profile yet, we show profile-sharing UI
  if (
    !left &&
    (conversationType === 'direct' ||
      (conversationType === 'group' && groupVersion === 1)) &&
    isMissingMandatoryProfileSharing
  ) {
    return (
      <MandatoryProfileSharingActions
        acceptConversation={acceptConversation}
        blockAndReportSpam={blockAndReportSpam}
        blockConversation={blockConversation}
        conversationId={conversationId}
        conversationType={conversationType}
        deleteConversation={deleteConversation}
        i18n={i18n}
        title={title}
      />
    );
  }

  // If this is a V1 group, now disabled entirely, we show UI to help them upgrade
  if (!left && isGroupV1AndDisabled) {
    return (
      <GroupV1DisabledActions
        conversationId={conversationId}
        i18n={i18n}
        showGV2MigrationDialog={showGV2MigrationDialog}
      />
    );
  }

  if (areWePendingApproval) {
    return (
      <GroupV2PendingApprovalActions
        cancelJoinRequest={cancelJoinRequest}
        conversationId={conversationId}
        i18n={i18n}
      />
    );
  }

  if (announcementsOnly && !areWeAdmin) {
    return (
      <AnnouncementsOnlyGroupBanner
        groupAdmins={groupAdmins}
        i18n={i18n}
        showConversation={showConversation}
        theme={theme}
      />
    );
  }

  if (isRecording) {
    return renderSmartCompositionRecording({
      onBeforeSend: handleRecordingBeforeSend,
    });
  }

  if (draftAttachments.length === 1 && isVoiceMessage(draftAttachments[0])) {
    const voiceNoteAttachment = draftAttachments[0];

    if (!voiceNoteAttachment.pending && voiceNoteAttachment.url) {
      return renderSmartCompositionRecordingDraft({ voiceNoteAttachment });
    }
  }

  return (
    <div className="CompositionArea">
      {attachmentToEdit &&
        'url' in attachmentToEdit &&
        attachmentToEdit.url && (
          <MediaEditor
            i18n={i18n}
            imageSrc={attachmentToEdit.url}
            imageToBlurHash={imageToBlurHash}
            isSending={false}
            onClose={() => setAttachmentToEdit(undefined)}
            onDone={({ data, contentType, blurHash }) => {
              const newAttachment = {
                ...attachmentToEdit,
                contentType,
                blurHash,
                data,
                size: data.byteLength,
              };

              addAttachment(conversationId, newAttachment);
              setAttachmentToEdit(undefined);
            }}
            installedPacks={installedPacks}
            recentStickers={recentStickers}
          />
        )}
      <div className="CompositionArea__toggle-large">
        <button
          type="button"
          className={classNames(
            'CompositionArea__toggle-large__button',
            large ? 'CompositionArea__toggle-large__button--large-active' : null
          )}
          // This prevents the user from tabbing here
          tabIndex={-1}
          onClick={handleToggleLarge}
          aria-label={i18n('CompositionArea--expand')}
        />
      </div>
      <div
        className={classNames(
          'CompositionArea__row',
          'CompositionArea__row--column'
        )}
      >
        {quotedMessageId && quotedMessageProps && (
          <div className="quote-wrapper">
            <Quote
              isCompose
              {...quotedMessageProps}
              i18n={i18n}
              onClick={() => scrollToMessage(conversationId, quotedMessageId)}
              onClose={() => {
                setQuoteByMessageId(conversationId, undefined);
              }}
            />
          </div>
        )}
        {draftAttachments.length ? (
          <div className="CompositionArea__attachment-list">
            <AttachmentList
              attachments={draftAttachments}
              canEditImages
              i18n={i18n}
              onAddAttachment={launchAttachmentPicker}
              onClickAttachment={maybeEditAttachment}
              onClose={() => onClearAttachments(conversationId)}
              onCloseAttachment={attachment => {
                if (attachment.path) {
                  removeAttachment(conversationId, attachment.path);
                }
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        className={classNames(
          'CompositionArea__row',
          large ? 'CompositionArea__row--padded' : null
        )}
      >
        {!large ? leftHandSideButtonsFragment : null}
        <div
          className={classNames(
            'CompositionArea__input',
            large ? 'CompositionArea__input--padded' : null
          )}
        >
          <CompositionInput
            clearQuotedMessage={clearQuotedMessage}
            conversationId={conversationId}
            disabled={isDisabled}
            draftBodyRanges={draftBodyRanges}
            draftText={draftText}
            getPreferredBadge={getPreferredBadge}
            getQuotedMessage={getQuotedMessage}
            i18n={i18n}
            inputApi={inputApiRef}
            large={large}
            linkPreviewLoading={linkPreviewLoading}
            linkPreviewResult={linkPreviewResult}
            onCloseLinkPreview={onCloseLinkPreview}
            onDirtyChange={setDirty}
            onEditorStateChange={onEditorStateChange}
            onPickEmoji={onPickEmoji}
            onSubmit={handleSubmit}
            onTextTooLong={onTextTooLong}
            skinTone={skinTone}
            sortedGroupMembers={sortedGroupMembers}
            theme={theme}
          />
        </div>
        {!large ? (
          <>
            {stickerButtonFragment}
            {!dirty ? micButtonFragment : null}
            {attButton}
          </>
        ) : null}
      </div>
      {large ? (
        <div
          className={classNames(
            'CompositionArea__row',
            'CompositionArea__row--control-row'
          )}
        >
          {leftHandSideButtonsFragment}
          {stickerButtonFragment}
          {attButton}
          {!dirty ? micButtonFragment : null}
          {dirty || !shouldShowMicrophone ? sendButtonFragment : null}
        </div>
      ) : null}
      <CompositionUpload
        conversationId={conversationId}
        draftAttachments={draftAttachments}
        i18n={i18n}
        processAttachments={processAttachments}
        ref={fileInputRef}
      />
    </div>
  );
}
