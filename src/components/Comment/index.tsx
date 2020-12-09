import React from 'react';
import ReactDOM from 'react-dom';
import dateFormat from 'dateformat';

import type { Store } from '../../state';
import type {
    Author,
    Comment,
} from '../../state/comments';
import { newCommentReply } from '../../state/comments';
import {
    updateComment,
    deleteComment,
    setFocusedComment,
    addReply,
    setPinnedComment
} from '../../actions/comments';
import { LayoutController } from '../../utils/layout';
import { getNextReplyId } from '../../utils/sequences';
import CommentReplyComponent, { saveCommentReply } from '../CommentReply';
import type { TranslatableStrings } from '../../main';

async function saveComment(comment: Comment, store: Store) {
    store.dispatch(
        updateComment(comment.localId, {
            mode: 'saving'
        })
    );

    try {

        store.dispatch(
            updateComment(comment.localId, {
                mode: 'default',
                remoteId: comment.remoteId,
                author: comment.author,
                date: comment.date
            })
        );
    } catch (err) {
        console.error(err);
        store.dispatch(
            updateComment(comment.localId, {
                mode: 'save_error'
            })
        );
    }
}

async function doDeleteComment(comment: Comment, store: Store) {
    store.dispatch(
        updateComment(comment.localId, {
            mode: 'deleting'
        })
    );

    try {
        store.dispatch(deleteComment(comment.localId));

        if (comment.annotation) {
            comment.annotation.onDelete();
        }
    } catch (err) {
        console.error(err);
        store.dispatch(
            updateComment(comment.localId, {
                mode: 'delete_error'
            })
        );
    }
}

export interface CommentProps {
    store: Store;
    comment: Comment;
    layout: LayoutController;
    user: Author;
    strings: TranslatableStrings;
}

export default class CommentComponent extends React.Component<CommentProps> {
    renderAuthorDate(): React.ReactFragment {
        let { comment } = this.props;

        let author = comment.author ? comment.author.name + ' - ' : '';

        return (
            <p className="comment__author-date">
                {author}
                {dateFormat(comment.date, 'h:MM mmmm d')}
            </p>
        );
    }

    renderReplies({ hideNewReply = false } = {}): React.ReactFragment {
        let { comment, store, user, strings } = this.props;

        if (!comment.remoteId) {
            // Hide replies UI if the comment itself isn't saved yet
            return <></>;
        }

        let onChangeNewReply = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    newReply: e.target.value
                })
            );
        };

        const sendReply = async (e: React.FormEvent) => {
            e.preventDefault();

            let replyId = getNextReplyId();
            let reply = newCommentReply(replyId, null, Date.now(), {
                text: comment.newReply,
                mode: 'saving'
            });
            store.dispatch(addReply(comment.localId, reply));

            store.dispatch(
                updateComment(comment.localId, {
                    newReply: ''
                })
            );

            await saveCommentReply(comment, reply, store);
        };

        let onClickCancelReply = (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    newReply: ''
                })
            );
        };

        let replies = [];
        let replyBeingEdited = false;
        for (const reply of comment.replies.values()) {
            if (reply.mode == 'saving' || reply.mode == 'editing') {
                replyBeingEdited = true;
            }

            if (!reply.deleted) {
                replies.push(
                    <CommentReplyComponent
                        key={reply.localId}
                        store={store}
                        user={user}
                        comment={comment}
                        reply={reply}
                        strings={strings}
                    />
                );
            }
        }

        // Hide new reply if a reply is being edited
        if (!hideNewReply && replyBeingEdited) {
            hideNewReply = true;
        }

        let replyActions = <></>;
        if (!hideNewReply && comment.isFocused && comment.newReply.length > 0) {
            replyActions = (
                <div className="comment__reply-actions">
                    <button
                        type="submit"
                        className="comment__button comment__button--primary"
                    >
                        {strings.REPLY}
                    </button>
                    <button
                        type="button"
                        onClick={onClickCancelReply}
                        className="comment__button"
                    >
                        {strings.CANCEL}
                    </button>
                </div>
            );
        }

        let replyTextarea = <></>;
        if (!hideNewReply && (comment.isFocused || comment.newReply)) {
            replyTextarea = (
                <textarea
                    className="comment__reply-input"
                    placeholder="Enter your reply..."
                    value={comment.newReply}
                    onChange={onChangeNewReply}
                    style={{ resize: 'none' }}
                />
            );
        }

        return (
            <form onSubmit={sendReply}>
                <ul className="comment__replies">{replies}</ul>
                {replyTextarea}
                {replyActions}
            </form>
        );
    }

    renderCreating(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    text: e.target.value
                })
            );
        };

        let onSave = async (e: React.FormEvent) => {
            e.preventDefault();
            await saveComment(comment, store);
        };

        let onCancel = (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(deleteComment(comment.localId));

            if (comment.annotation) {
                comment.annotation.onDelete();
            }
        };

        return (
            <>
                <form onSubmit={onSave}>
                    <textarea
                        className="comment__input"
                        value={comment.text}
                        onChange={onChangeText}
                        style={{ resize: 'none' }}
                        placeholder="Enter your comments..."
                    />
                    <div className="comment__actions">
                        <button
                            type="submit"
                            className="comment__button comment__button--primary"
                        >
                            {strings.SAVE}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel} 
                            className="comment__button"
                        >
                            {strings.CANCEL}
                        </button>
                    </div>
                </form>
            </>
        );
    }

    renderEditing(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    text: e.target.value
                })
            );
        };

        let onSave = async (e: React.FormEvent) => {
            e.preventDefault();

            await saveComment(comment, store);
        };

        let onCancel = (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    mode: 'default',
                    text: comment.editPreviousText
                })
            );
        };

        return (
            <>
                <form onSubmit={onSave}>
                    <textarea
                        className="comment__input"
                        value={comment.text}
                        onChange={onChangeText}
                        style={{ resize: 'none' }}
                    />
                    <div className="comment__actions">
                        <button
                            type="submit"
                            className="comment__button comment__button--primary"
                        >
                            {strings.SAVE}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="comment__button">
                            {strings.CANCEL}
                        </button>
                    </div>
                </form>
                {this.renderReplies({ hideNewReply: true })}
            </>
        );
    }

    renderSaving(): React.ReactFragment {
        let { comment, strings } = this.props;

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                <div className="comment__progress">{strings.SAVING}</div>
                {this.renderReplies({ hideNewReply: true })}
            </>
        );
    }

    renderSaveError(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onClickRetry = async (e: React.MouseEvent) => {
            e.preventDefault();

            await saveComment(comment, store);
        };

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                {this.renderReplies({ hideNewReply: true })}
                <div className="comment__error">
                    {strings.SAVE_ERROR}
                    <button
                        type="button"
                        className="comment__button"
                        onClick={onClickRetry}
                    >
                        {strings.RETRY}
                    </button>
                </div>
            </>
        );
    }

    renderDeleteConfirm(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onClickDelete = async (e: React.MouseEvent) => {
            e.preventDefault();

            await doDeleteComment(comment, store);
        };

        let onClickCancel = (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    mode: 'default'
                })
            );
        };

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                <div className="comment__confirm-delete">
                    {strings.CONFIRM_DELETE_COMMENT}
                    <button
                        type="button"
                        className="comment__button comment__button--red"
                        onClick={onClickDelete}
                    >
                        {strings.DELETE}
                    </button>
                    <button
                        type="button"
                        className="comment__button"
                        onClick={onClickCancel}
                    >
                        {strings.CANCEL}
                    </button>
                </div>
                {this.renderReplies({ hideNewReply: true })}
            </>
        );
    }

    renderDeleting(): React.ReactFragment {
        let { comment, strings } = this.props;

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                <div className="comment__progress">{strings.DELETING}</div>
                {this.renderReplies({ hideNewReply: true })}
            </>
        );
    }

    renderDeleteError(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onClickRetry = async (e: React.MouseEvent) => {
            e.preventDefault();

            await doDeleteComment(comment, store);
        };

        let onClickCancel = async (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    mode: 'default'
                })
            );
        };

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                {this.renderReplies({ hideNewReply: true })}
                <div className="comment__error">
                    {strings.DELETE_ERROR}
                    <button
                        type="button"
                        className="comment__button"
                        onClick={onClickCancel}
                    >
                        {strings.CANCEL}
                    </button>
                    <button
                        type="button"
                        className="comment__button"
                        onClick={onClickRetry}
                    >
                        {strings.RETRY}
                    </button>
                </div>
            </>
        );
    }

    renderDefault(): React.ReactFragment {
        let { comment, store, strings } = this.props;

        let onClickEdit = async (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    mode: 'editing',
                    editPreviousText: comment.text
                })
            );
        };

        let onClickDelete = async (e: React.MouseEvent) => {
            e.preventDefault();

            store.dispatch(
                updateComment(comment.localId, {
                    mode: 'delete_confirm'
                })
            );
        };

        const onClickResolve = async (e: React.MouseEvent) => {
            e.preventDefault();

            await doDeleteComment(comment, store);
        };

        let actions = <></>;
        if (
            comment.author == null ||
            this.props.user.id === comment.author.id
        ) {
            actions = (
                <>
                    <button
                        type="button"
                        className="comment__button comment__button--primary"
                        onClick={onClickEdit}
                    >
                        {strings.EDIT}
                    </button>
                    <button
                        type="button"
                        className="comment__button"
                        onClick={onClickDelete}
                    >
                        {strings.DELETE}
                    </button>
                </>
            );
        }

        return (
            <>
                <p className="comment__text">{comment.text}</p>
                {this.renderAuthorDate()}
                <div className="comment__actions">
                    {actions}
                    <div className="comment__resolved">
                        <button 
                            type="button"
                            className="comment__button"
                            onClick={onClickResolve}
                        >
                            {strings.RESOLVE}
                        </button>
                    </div>
                </div>
                {this.renderReplies()}
            </>
        );
    }

    render() {
        let inner: React.ReactFragment;

        switch (this.props.comment.mode) {
            case 'creating':
                inner = this.renderCreating();
                break;

            case 'editing':
                inner = this.renderEditing();
                break;

            case 'saving':
                inner = this.renderSaving();
                break;

            case 'save_error':
                inner = this.renderSaveError();
                break;

            case 'delete_confirm':
                inner = this.renderDeleteConfirm();
                break;

            case 'deleting':
                inner = this.renderDeleting();
                break;

            case 'delete_error':
                inner = this.renderDeleteError();
                break;

            default:
                inner = this.renderDefault();
                break;
        }

        let onClick = () => {
            this.props.store.dispatch(
                setFocusedComment(this.props.comment.localId)
            );
        };

        let onDoubleClick = () => {
            this.props.store.dispatch(
                setPinnedComment(this.props.comment.localId)
            );
        };

        let top = this.props.layout.getCommentPosition(
            this.props.comment.localId
        );
        let right = this.props.comment.isFocused ? 50 : 0;
        return (
            <li
                key={this.props.comment.localId}
                className={`comment comment--mode-${this.props.comment.mode}`}
                style={{
                    position: 'absolute',
                    top: `${top}px`,
                    right: `${right}px`
                }}
                data-comment-id={this.props.comment.localId}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
            >
                {inner}
            </li>
        );
    }

    componentDidMount() {
        let element = ReactDOM.findDOMNode(this);

        if (element instanceof HTMLElement) {
            // If this is a new comment, focus in the edit box
            if (this.props.comment.mode == 'creating') {
                let textAreaElement = element.querySelector('textarea');

                if (textAreaElement instanceof HTMLTextAreaElement) {
                    textAreaElement.focus();
                }
            }

            this.props.layout.setCommentElement(
                this.props.comment.localId,
                element
            );
            this.props.layout.setCommentHeight(
                this.props.comment.localId,
                element.offsetHeight
            );
        }

        if (this.props.comment.annotation) {
            this.props.comment.annotation.show();
        }
    }

    componentWillUnmount() {
        this.props.layout.setCommentElement(this.props.comment.localId, null);

        if (this.props.comment.annotation) {
            this.props.comment.annotation.hide();
        }
    }

    componentDidUpdate() {
        let element = ReactDOM.findDOMNode(this);

        // Keep height up to date so that other comments will be moved out of the way
        if (element instanceof HTMLElement) {
            this.props.layout.setCommentHeight(
                this.props.comment.localId,
                element.offsetHeight
            );
        }
    }
}
