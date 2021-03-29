import dateFormat from "dateformat";
import React, { FunctionComponent } from "react";

import { Author } from "../../state/comments";

interface CommentHeaderProps {
    author: Author | null;
    date: number;
}

export const CommentHeader: FunctionComponent<CommentHeaderProps> = ({author, date}) => {
  return (
    <div className="comment-header">
      {author && author.avatarUrl && <img className="comment-header__avatar" src={author.avatarUrl} />}
      <p className="comment-header__author">{author ? author.name : ''}</p>
      <p className="comment-header__date">{dateFormat(date, 'h:MM mmmm d')}</p>
    </div>
  );
};
