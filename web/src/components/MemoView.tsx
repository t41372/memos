import { Tooltip } from "@mui/joy";
import classNames from "classnames";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useCurrentUser from "@/hooks/useCurrentUser";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useUserStore, extractUsernameFromName } from "@/store/v1";
import { MemoRelation_Type } from "@/types/proto/api/v2/memo_relation_service";
import { Memo, Visibility } from "@/types/proto/api/v2/memo_service";
import { useTranslate } from "@/utils/i18n";
import { convertVisibilityToString } from "@/utils/memo";
import showChangeMemoCreatedTsDialog from "./ChangeMemoCreatedTsDialog";
import Icon from "./Icon";
import MemoActionMenu from "./MemoActionMenu";
import MemoContent from "./MemoContent";
import MemoReactionistView from "./MemoReactionListView";
import MemoRelationListView from "./MemoRelationListView";
import MemoResourceListView from "./MemoResourceListView";
import showPreviewImageDialog from "./PreviewImageDialog";
import ReactionSelector from "./ReactionSelector";
import UserAvatar from "./UserAvatar";
import VisibilityIcon from "./VisibilityIcon";

interface Props {
  memo: Memo;
  compact?: boolean;
  showVisibility?: boolean;
  showPinned?: boolean;
  className?: string;
}

const MemoView: React.FC<Props> = (props: Props) => {
  const { memo, className } = props;
  const t = useTranslate();
  const location = useLocation();
  const navigateTo = useNavigateTo();
  const currentUser = useCurrentUser();
  const userStore = useUserStore();
  const user = useCurrentUser();
  const [creator, setCreator] = useState(userStore.getUserByUsername(extractUsernameFromName(memo.creator)));
  const memoContainerRef = useRef<HTMLDivElement>(null);
  const referencedMemos = memo.relations.filter((relation) => relation.type === MemoRelation_Type.REFERENCE);
  const commentAmount = memo.relations.filter(
    (relation) => relation.type === MemoRelation_Type.COMMENT && relation.relatedMemoId === memo.id,
  ).length;
  const readonly = memo.creator !== user?.name;
  const isInMemoDetailPage = location.pathname.startsWith(`/m/${memo.name}`);

  // Initial related data: creator.
  useEffect(() => {
    (async () => {
      const user = await userStore.getOrFetchUserByUsername(extractUsernameFromName(memo.creator));
      setCreator(user);
    })();
  }, []);

  const handleGotoMemoDetailPage = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.altKey) {
      showChangeMemoCreatedTsDialog(memo.id);
    } else {
      navigateTo(`/m/${memo.name}`);
    }
  };

  const handleMemoContentClick = useCallback(async (e: React.MouseEvent) => {
    const targetEl = e.target as HTMLElement;

    if (targetEl.tagName === "IMG") {
      const imgUrl = targetEl.getAttribute("src");
      if (imgUrl) {
        showPreviewImageDialog([imgUrl], 0);
      }
    }
  }, []);

  return (
    <div
      className={classNames(
        "group relative flex flex-col justify-start items-start w-full px-4 pt-4 pb-3 mb-2 gap-2 bg-white dark:bg-zinc-800 rounded-lg border border-white dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700",
        "memos-" + memo.id,
        memo.pinned && props.showPinned && "border-gray-200 border dark:border-zinc-700",
        className,
      )}
      ref={memoContainerRef}
    >
      <div className="w-full h-7 flex flex-row justify-between items-center gap-2">
        <div className="w-auto max-w-[calc(100%-8rem)] grow flex flex-row justify-start items-center">
          {creator && (
            <div className="w-full flex flex-row justify-start items-center">
              <Link
                className="w-auto hover:opacity-80"
                to={`/u/${encodeURIComponent(extractUsernameFromName(memo.creator))}`}
                unstable_viewTransition
              >
                <UserAvatar className="mr-2 shrink-0" avatarUrl={creator.avatarUrl} />
              </Link>
              <div className="w-full flex flex-col justify-center items-start">
                <Link
                  className="w-auto leading-none hover:opacity-80"
                  to={`/u/${encodeURIComponent(extractUsernameFromName(memo.creator))}`}
                  unstable_viewTransition
                >
                  <span className="text-gray-600 text-lg leading-none max-w-[80%] truncate dark:text-gray-400">
                    {creator.nickname || creator.username}
                  </span>
                </Link>
                <span className="text-gray-400 text-sm leading-none max-w-[80%] truncate dark:text-gray-500">{creator.description}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-row justify-end items-center select-none shrink-0 gap-2">
          <div className="w-auto invisible group-hover:visible flex flex-row justify-between items-center gap-2">
            {props.showVisibility && memo.visibility !== Visibility.PRIVATE && (
              <Tooltip title={t(`memo.visibility.${convertVisibilityToString(memo.visibility).toLowerCase()}` as any)} placement="top">
                <span className="flex justify-center items-center hover:opacity-70">
                  <VisibilityIcon visibility={memo.visibility} />
                </span>
              </Tooltip>
            )}
            {currentUser && <ReactionSelector className="border-none w-auto h-auto" memo={memo} />}
          </div>
          {!isInMemoDetailPage && (
            <Link
              className={classNames(
                "flex flex-row justify-start items-center hover:opacity-70",
                commentAmount === 0 && "invisible group-hover:visible",
              )}
              to={`/m/${memo.name}#comments`}
              unstable_viewTransition
            >
              <Icon.MessageCircleMore className="w-4 h-4 mx-auto text-gray-500 dark:text-gray-400" />
              {commentAmount > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{commentAmount}</span>}
            </Link>
          )}
          {props.showPinned && memo.pinned && (
            <Tooltip title={"Pinned"} placement="top">
              <Icon.Bookmark className="w-4 h-auto text-amber-500" />
            </Tooltip>
          )}
          {!readonly && <MemoActionMenu className="-ml-1" memo={memo} hiddenActions={props.showPinned ? [] : ["pin"]} />}
        </div>
      </div>
      <MemoContent
        key={`${memo.id}-${memo.updateTime}`}
        memoId={memo.id}
        content={memo.content}
        readonly={readonly}
        onClick={handleMemoContentClick}
        compact={props.compact ?? true}
      />
      <MemoResourceListView resources={memo.resources} />
      <div className="w-full flex flex-row justify-between items-center">
        <div className="text-sm leading-none text-gray-400 select-none">
          <relative-time datetime={memo.displayTime?.toISOString()} tense="past" onClick={handleGotoMemoDetailPage}></relative-time>
        </div>
      </div>
      <MemoRelationListView memo={memo} relations={referencedMemos} />
      <MemoReactionistView memo={memo} reactions={memo.reactions} />
    </div>
  );
};

export default memo(MemoView);
