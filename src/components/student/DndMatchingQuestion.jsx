import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import ResourcePreview from "../common/ResourcePreview";
import QuizRichText from "../common/QuizRichText";

const renderContent = (item, fallback) => (
  <div className="space-y-2 pointer-events-none">
    {item?.resource && (
      <div className="[&_img]:!max-h-[140px] [&_video]:!max-h-[140px] [&_img]:mx-auto [&_video]:mx-auto w-full">
        <ResourcePreview resource={item.resource} />
      </div>
    )}
    {!item?.resource && item?.resourceId && (
      <img
        src={`${import.meta.env.VITE_BACKEND_URL}/api/v1/lms/resources/${item.resourceId}/view`}
        className="!max-h-[140px] max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain mx-auto"
        alt=""
      />
    )}
    {item?.content ? (
      <QuizRichText html={item.content} className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center" />
    ) : (
      !item?.resource && !item?.resourceId && <span className="block text-center text-sm font-medium">{fallback}</span>
    )}
  </div>
);

function DraggableMatch({ match, fallbackLabel }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: match.id,
    data: { type: "MATCH", match },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative rounded-xl border p-3 bg-white dark:bg-slate-900 cursor-grab hover:border-primary transition-colors touch-none min-w-[150px] ${isDragging ? "opacity-30 border-primary shadow-lg" : "border-slate-200 dark:border-slate-700 shadow-sm"
        }`}
    >
      {renderContent(match, fallbackLabel)}
    </div>
  );
}

function MatchDropZone({ prompt, assignedMatch, matchFallbackLabel }) {
  const { isOver, setNodeRef } = useDroppable({
    id: prompt.id,
    data: { type: "PROMPT", prompt },
  });

  return (
    <div className="flex-1 min-w-[200px] h-full flex flex-col justify-center items-center">
      <div
        ref={setNodeRef}
        className={`w-full h-full min-h-[140px] rounded-xl border-2 border-dashed p-3 transition-colors flex flex-col items-center justify-center ${isOver ? "border-primary bg-primary/10" : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
          }`}
      >
        {assignedMatch ? (
          <div className="w-full h-full relative group flex flex-col items-center justify-center">
            {/* Draggable match placed inside */}
            <DraggableMatch match={assignedMatch} fallbackLabel={matchFallbackLabel} />
            {/* Highlight overlay to indicate it can be grabbed again */}
            <div className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm font-medium">Kéo thả đáp án vào đây</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerPoolDropZone({ children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "unassigned-pool",
    data: { type: "POOL" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[160px] rounded-xl border-2 p-4 transition-colors flex flex-wrap gap-4 items-center justify-center ${isOver ? "border-primary border-dashed bg-primary/10" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
        }`}
    >
      {children}
      {React.Children.count(children) === 0 && !isOver && (
        <div className="text-center">
          <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2 opacity-75" />
          <span className="text-slate-500 font-medium">Tuyệt vời! Tất cả đáp án đã được ghép</span>
        </div>
      )}
    </div>
  );
}

// Ensure CheckCircleIcon is imported for the empty pool state
import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default function DndMatchingQuestion({
  question,
  prompts,
  matches,
  currentMatches = {}, // { promptId: selectedMatchId }
  onMatchChange,       // (question, nextMatches) => void
}) {
  const [activeId, setActiveId] = useState(null);
  const activeMatch = activeId ? matches.find((m) => m.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const matchId = active.id;
    const overId = over.id;

    const nextMatches = { ...currentMatches };

    // If dropping into the pool, remove from any prompt it was currently assigned to
    if (overId === "unassigned-pool") {
      let changed = false;
      Object.keys(nextMatches).forEach((pId) => {
        if (nextMatches[pId] === matchId) {
          delete nextMatches[pId];
          changed = true;
        }
      });
      if (changed) onMatchChange(question, nextMatches);
      return;
    }

    // Dropping onto a prompt
    const promptId = overId;

    // Check if the match is coming from another prompt, remove it from there
    Object.keys(nextMatches).forEach((pId) => {
      if (nextMatches[pId] === matchId && pId !== promptId) {
        delete nextMatches[pId];
      }
    });

    // Assign the new match
    nextMatches[promptId] = matchId;
    onMatchChange(question, nextMatches);
  };

  const assignedMatchIds = new Set(Object.values(currentMatches));
  const unassignedMatches = matches.filter((m) => !assignedMatchIds.has(m.id));

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Prompts list */}
        <div className="space-y-4">
          {prompts.map((prompt, index) => {
            const assignedMatchId = currentMatches[prompt.id];
            const assignedMatch = matches.find((m) => m.id === assignedMatchId);

            return (
              <div
                key={prompt.id}
                className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Header */}
                <div className="font-bold text-slate-400 dark:text-slate-500 mb-1 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    {index + 1}
                  </span>
                  Câu hỏi
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  {/* Left Side: Prompt */}
                  <div className="flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 pb-4 md:pb-0 md:pr-4">
                    {renderContent(prompt, `Nội dung ${index + 1}`)}
                  </div>

                  {/* Right Side: Drop Zone */}
                  <MatchDropZone
                    prompt={prompt}
                    assignedMatch={assignedMatch}
                    matchFallbackLabel={`Đáp án`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Answer Pool */}
        <div className="pt-2 bg-slate-50/50 dark:bg-slate-900/30 -mx-6 md:-mx-8 px-6 md:px-8 pb-6 md:pb-8 border-t border-slate-200 dark:border-slate-800">
          <div className="pt-6 font-semibold text-slate-700 dark:text-slate-200 mb-4 uppercase tracking-wide text-sm flex flex-col md:flex-row md:items-center gap-2">
            <span>Danh sách đáp án</span>
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full w-fit">
              Kéo thả vào ô trống phía trên
            </span>
          </div>
          <AnswerPoolDropZone>
            {unassignedMatches.map((match, index) => (
              <DraggableMatch
                key={match.id}
                match={match}
                fallbackLabel={`Đáp án ${index + 1}`}
              />
            ))}
          </AnswerPoolDropZone>
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeMatch ? (
          <div className="opacity-95 shadow-2xl scale-105 rounded-xl bg-white dark:bg-slate-800 overflow-hidden ring-4 ring-primary cursor-grabbing min-w-[150px]">
            <div className="p-3">
              {renderContent(activeMatch, "Đang kéo...")}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
