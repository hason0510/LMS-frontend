import React from "react";
import ResourceRenderer from "../media/ResourceRenderer";

export default function ResourcePreview({ resource, className = "" }) {
  return <ResourceRenderer resource={resource} className={className} />;
}
