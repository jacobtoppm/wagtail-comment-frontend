import dateFormat from "dateformat";
import React, { FunctionComponent } from "react";
import type { Store } from '../../state';
import { TranslatableStrings } from "../../main";

import { Author } from "../../state/comments";


interface CommentReply {
  author: Author | null;
  date: number;
}

interface CommentHeaderProps {
  commentReply: CommentReply;
  store: Store;
  strings: TranslatableStrings;
  onResolve?(commentReply: CommentReply, store: Store): void;
  onEdit?(commentReply: CommentReply, store: Store): void;
  onDelete?(commentReply: CommentReply, store: Store): void;
}

export const CommentHeader: FunctionComponent<CommentHeaderProps> = ({ commentReply, store, strings, onResolve, onEdit, onDelete }) => {
  const { author, date } = commentReply;

  const onClickResolve = (e: React.MouseEvent) => {
    e.preventDefault();

    if (onResolve) {
      onResolve(commentReply, store);
    }
  };

  const onClickEdit = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (onEdit) {
      onEdit(commentReply, store);
    }
  };

  const onClickDelete = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (onDelete) {
      onDelete(commentReply, store);
    }
  };

  return (
    <div className="comment-header">
      <div className="comment-header__actions">
        {onResolve &&
          <div className="comment-header__action comment-header__action--teal">
            <button type="button" aria-label={strings.RESOLVE} onClick={onClickResolve}>
              <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check" className="svg-inline--fa fa-check fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path></svg>
            </button>
          </div>
        }
        {(onEdit || onDelete) &&
          <div className="comment-header__action">
            <details>
              <summary aria-label={strings.MORE_ACTIONS} aria-haspopup="menu" role="button">
                <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="ellipsis-v" className="svg-inline--fa fa-ellipsis-v fa-w-6" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 512"><path fill="currentColor" d="M96 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM24 80c0 39.8 32.2 72 72 72s72-32.2 72-72S135.8 8 96 8 24 40.2 24 80zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z"></path></svg>
              </summary>

              <div className="comment-header__more-actions">
                {onEdit && <button type="button" role="menuitem" onClick={onClickEdit}>{strings.EDIT}</button>}
                {onDelete && <button type="button" role="menuitem" onClick={onClickDelete}>{strings.DELETE}</button>}
              </div>
            </details>
          </div>
        }
      </div>
      {author && author.avatarUrl && <img className="comment-header__avatar" src={author.avatarUrl} />}
      <p className="comment-header__author">{author ? author.name : ''}</p>
      <p className="comment-header__date">{dateFormat(date, 'h:MM mmmm d')}</p>
    </div>
  );
};
