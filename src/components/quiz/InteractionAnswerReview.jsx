import React from "react";
import { useTranslation } from "react-i18next";
import ResourcePreview from "../common/ResourcePreview";
import QuizRichText from "../common/QuizRichText";

const sortByOrder = (items = []) =>
  [...items].sort((left, right) => (left.orderIndex || 0) - (right.orderIndex || 0));

const getItemsByRole = (question, role) =>
  sortByOrder((question?.items || []).filter((item) => item.role === role));

const QuestionItemCard = ({ item, fallback }) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
    <div className="space-y-2">
      <ResourcePreview resource={item?.resource} />
      {item?.content ? (
        <QuizRichText html={item.content} className="text-sm font-medium text-slate-700 dark:text-slate-200" />
      ) : (
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{fallback}</span>
      )}
    </div>
  </div>
);

const ArrowDivider = () => (
  <span className="shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">-&gt;</span>
);

function MatchingPairs({ question, answerItems = [], mode }) {
  const { t } = useTranslation();
  const prompts = getItemsByRole(question, "PROMPT");
  const matches = getItemsByRole(question, "MATCH");
  const itemsById = new Map((question?.items || []).map((item) => [item.id, item]));
  const matchesByKey = new Map(matches.map((item) => [item.itemKey, item]));
  const selectedByPromptId = new Map(answerItems.map((item) => [item.itemId, item.selectedItemId]));

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => {
        const target =
          mode === "correct"
            ? matchesByKey.get(prompt.correctMatchKey)
            : itemsById.get(selectedByPromptId.get(prompt.id));
        return (
          <div
            key={prompt.id || `prompt-${index}`}
            className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40 md:grid-cols-[1fr_auto_1fr]"
          >
            <QuestionItemCard item={prompt} fallback={`${t("quizAttempts.prompt")} ${index + 1}`} />
            <div className="flex items-center justify-center">
              <ArrowDivider />
            </div>
            <QuestionItemCard
              item={target}
              fallback={mode === "correct" ? t("quizAttempts.noCorrectAnswer") : t("quizAttempts.notSelected")}
            />
          </div>
        );
      })}
    </div>
  );
}

function OrderSequence({ items = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, index) => (
        <React.Fragment key={item?.id || `order-${index}`}>
          <div className="min-w-[180px] max-w-full flex-1">
            <QuestionItemCard item={item} fallback={`Item ${index + 1}`} />
          </div>
          {index < items.length - 1 && <ArrowDivider />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function getQuestionTypeLabel(type, t) {
  return t(`quizBuilder.types.${type}`, { defaultValue: type || "-" });
}

export default function InteractionAnswerReview({
  question,
  answerItems = [],
  mode = "user",
}) {
  if (!question) {
    return null;
  }

  if (question.type === "MATCHING" || question.type === "IMAGE_MATCHING") {
    return <MatchingPairs question={question} answerItems={answerItems} mode={mode} />;
  }

  if (question.type === "DRAG_ORDER") {
    const itemsById = new Map((question.items || []).map((item) => [item.id, item]));
    const orderedItems =
      mode === "correct"
        ? [...getItemsByRole(question, "ORDER_ITEM")].sort(
            (left, right) =>
              (left.correctOrderIndex || left.orderIndex || 0) - (right.correctOrderIndex || right.orderIndex || 0)
          )
        : [...answerItems]
            .sort((left, right) => (left.submittedOrderIndex || 0) - (right.submittedOrderIndex || 0))
            .map((item) => itemsById.get(item.itemId))
            .filter(Boolean);
    return <OrderSequence items={orderedItems} />;
  }

  return null;
}
