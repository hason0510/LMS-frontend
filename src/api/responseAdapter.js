export const unwrapPayload = (response) => response?.data?.data ?? response?.data;

export const unwrapListPayload = (response) => {
  const payload = unwrapPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.pageList)) return payload.pageList;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

export const unwrapPagePayload = (response) => {
  const payload = unwrapPayload(response);
  if (payload && typeof payload === "object" && Array.isArray(payload.pageList)) {
    return {
      items: payload.pageList,
      currentPage: payload.currentPage || 1,
      totalPage: payload.totalPage || 1,
      totalElements: payload.totalElements || 0,
    };
  }

  const items = unwrapListPayload(response);
  return {
    items,
    currentPage: 1,
    totalPage: 1,
    totalElements: items.length,
  };
};
