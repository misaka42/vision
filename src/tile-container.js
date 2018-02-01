/**
 * 2018/2/1
 *
 * Copyright(c) Alibaba Group Holding Limited.
 *
 * Authors:
 *   乔杨 <peiqiao.ppq@alipay.com>
 */

"use strict";

import { h } from "hyperapp";
import Tile from "./tile";

export default function({
  size,
  containerWidth,
  position,
  startIndex,
  startClassName,
  status
}, actions) {
  const shouldShowStartTile = status === "start" || status === "over";
  const children = position.map((v, key) =>
    Tile({
      key,
      size: containerWidth / size,
      x: v % size,
      y: Math.floor(v / size),
      extraClass: shouldShowStartTile
        ? key === startIndex ? startClassName : null
        : null,
      onclick: index => actions.pickTile(index)
    })
  );
  return h(
    "div",
    {
      class: "tile-container",
      style: {
        height: containerWidth + "px"
      }
    },
    children
  );
}
