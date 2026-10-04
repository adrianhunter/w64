import { use as _$use } from "@gpuix/solid";
import { createTextNode as _$createTextNode } from "@gpuix/solid";
import { insertNode as _$insertNode } from "@gpuix/solid";
import { insert as _$insert } from "@gpuix/solid";
import { createComponent as _$createComponent } from "@gpuix/solid";
import { memo as _$memo } from "@gpuix/solid";
import { setProp as _$setProp } from "@gpuix/solid";
import { effect as _$effect } from "@gpuix/solid";
import { createElement as _$createElement } from "@gpuix/solid";
/**
 * The GPUIX chat example, ported to Solid.
 *
 * Same layout and interactions as the React `examples/chat.tsx`: a transparent
 * titlebar, traffic lights in the sidebar, graphite surfaces, composer chips,
 * and a workspace footer. Markdown turns use the native `<markdown>` element
 * instead of React's safe-mdx tree, because safe-mdx is a React library.
 *
 * Run on desktop: cd examples && bun --hot solid/chat.tsx
 */

import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Button, createWindowInsets, Dialog, DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogTitle, motion, render, Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, useGpuix } from "@gpuix/solid";
import iconCompose from "../assets/icons/compose.svg" with { type: "text" };
import iconSearch from "../assets/icons/search.svg" with { type: "text" };
import iconSidebar from "../assets/icons/panel-left.svg" with { type: "text" };
import iconPanelRight from "../assets/icons/panel-right.svg" with { type: "text" };
import iconArrowLeft from "../assets/icons/arrow-left.svg" with { type: "text" };
import iconArrowRight from "../assets/icons/arrow-right.svg" with { type: "text" };
import iconFolder from "../assets/icons/folder.svg" with { type: "text" };
import iconSettings from "../assets/icons/settings.svg" with { type: "text" };
import iconGitBranch from "../assets/icons/git-branch.svg" with { type: "text" };
import iconLaptop from "../assets/icons/laptop.svg" with { type: "text" };
import iconLockOpen from "../assets/icons/lock-open.svg" with { type: "text" };
import iconLock from "../assets/icons/lock.svg" with { type: "text" };
import iconList from "../assets/icons/list.svg" with { type: "text" };
import iconZap from "../assets/icons/zap.svg" with { type: "text" };
import iconPencil from "../assets/icons/pencil.svg" with { type: "text" };
import iconChevronDown from "../assets/icons/chevron-down.svg" with { type: "text" };
import iconChevronRight from "../assets/icons/chevron-right.svg" with { type: "text" };
import iconListFilter from "../assets/icons/list-filter.svg" with { type: "text" };
import iconSparkle from "../assets/icons/sparkle.svg" with { type: "text" };
import iconWrench from "../assets/icons/wrench.svg" with { type: "text" };
import iconSend from "../assets/icons/arrow-up.svg" with { type: "text" };
import iconCopy from "../assets/icons/copy.svg" with { type: "text" };
import iconCheck from "../assets/icons/check.svg" with { type: "text" };
import iconRetry from "../assets/icons/rotate-ccw.svg" with { type: "text" };
import iconThumbsUp from "../assets/icons/thumbs-up.svg" with { type: "text" };
import iconThumbsDown from "../assets/icons/thumbs-down.svg" with { type: "text" };
import iconShare from "../assets/icons/share.svg" with { type: "text" };
import iconMore from "../assets/icons/ellipsis.svg" with { type: "text" };
const C = {
  canvas: "#1A1A1A",
  sidebar: "#181818",
  raised: "#232323",
  composer: "#212121",
  overlay: "#E6EAF20D",
  overlayStrong: "#E6EAF217",
  item: "#F0F0F00F",
  border: "#E6EAF212",
  borderStrong: "#E6EAF224",
  sidebarBorder: "#292929",
  text: "#E2E2E2",
  secondary: "#A3A3A3",
  tertiary: "#7D7D7D",
  ghost: "#575757",
  accent: "#E2795B",
  inverse: "#E7E9EC",
  onInverse: "#17181C",
  codeText: "#E0A882"
};
const SIDEBAR_WIDTH = 252;
const TRAFFIC_LIGHT_CLEARANCE = typeof process !== "undefined" && process.platform === "darwin" ? 86 : 8;
const CONTENT_MAX_WIDTH = 720;
const TITLEBAR_HEIGHT = 48;
const FONT_SANS = typeof window === "undefined" ? "Helvetica" : "IBM Plex Sans";
const ICONS = {
  compose: iconCompose,
  search: iconSearch,
  sidebar: iconSidebar,
  panelRight: iconPanelRight,
  arrowLeft: iconArrowLeft,
  arrowRight: iconArrowRight,
  folder: iconFolder,
  settings: iconSettings,
  gitBranch: iconGitBranch,
  laptop: iconLaptop,
  lockOpen: iconLockOpen,
  lock: iconLock,
  list: iconList,
  zap: iconZap,
  pencil: iconPencil,
  chevronDown: iconChevronDown,
  chevronRight: iconChevronRight,
  listFilter: iconListFilter,
  sparkle: iconSparkle,
  wrench: iconWrench,
  send: iconSend,
  copy: iconCopy,
  check: iconCheck,
  retry: iconRetry,
  thumbsUp: iconThumbsUp,
  thumbsDown: iconThumbsDown,
  share: iconShare,
  more: iconMore
};
function Icon(props) {
  return (() => {
    var _el$ = _$createElement("svg");
    _$effect(_p$ => {
      var _v$ = ICONS[props.name],
        _v$2 = {
          width: props.size ?? 14,
          height: props.size ?? 14,
          flexShrink: 0,
          color: props.color,
          pointerEvents: "none"
        };
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$, "source", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$, "style", _v$2, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$;
  })();
}
const CHAT_THEME = {
  text: C.text,
  textMuted: C.secondary,
  textFaint: C.tertiary,
  textDim: C.secondary,
  border: C.border,
  bg: C.canvas,
  accent: C.accent,
  caret: C.accent,
  fontSans: FONT_SANS,
  codeText: C.codeText,
  codeWash: "#E6EAF214",
  metrics: {
    mdTextSize: 14,
    mdLineHeight: 22,
    mdBlockGap: 14,
    mdHeadingSizes: [20, 16, 14, 14],
    mdHeadingLineHeights: [28, 24, 22, 22],
    codeTextSize: 12.5,
    codeLineHeight: 20,
    diffLineHeight: 20,
    diffFileHeaderHeight: 34
  }
};
const MODELS = [{
  id: "deepseek-v4-flash",
  label: "DeepSeek V4 Flash",
  group: "DeepSeek",
  icon: "sparkle"
}, {
  id: "deepseek-v4",
  label: "DeepSeek V4",
  group: "DeepSeek",
  icon: "sparkle"
}, {
  id: "opus-4.6",
  label: "Claude Opus 4.6",
  group: "Claude",
  icon: "sparkle"
}, {
  id: "sonnet-4.6",
  label: "Claude Sonnet 4.6",
  group: "Claude",
  icon: "sparkle"
}, {
  id: "gpt-5.4",
  label: "GPT-5.4",
  group: "OpenAI",
  icon: "sparkle"
}, {
  id: "grok-4",
  label: "Grok 4",
  group: "xAI",
  icon: "sparkle"
}];
const REASONING = [{
  id: "high",
  label: "High",
  hint: "Default"
}, {
  id: "medium",
  label: "Medium",
  hint: undefined
}, {
  id: "low",
  label: "Low",
  hint: undefined
}];
const ACCESS = [{
  id: "ask",
  label: "Supervised",
  description: "Ask before every tool call",
  icon: "lock"
}, {
  id: "edits",
  label: "Auto-accept edits",
  description: "Edit files without asking",
  icon: "pencil"
}, {
  id: "auto",
  label: "Auto",
  description: "Run most tools without asking",
  icon: "sparkle"
}, {
  id: "full",
  label: "Full access",
  description: "No permission prompts",
  icon: "lockOpen"
}];
const PROJECTS = [{
  id: "gpuix",
  label: "gpuix"
}, {
  id: "example-app",
  label: "example-app"
}, {
  id: "none",
  label: "No project"
}];
const WORKSPACES = [{
  id: "local",
  label: "Local",
  icon: "laptop"
}, {
  id: "worktree",
  label: "New worktree",
  icon: "gitBranch"
}];
const BRANCHES = [{
  id: "main",
  label: "main"
}, {
  id: "feat-selectors",
  label: "feat/selectors"
}, {
  id: "chat-example",
  label: "chat-example"
}];
const OVERVIEW = `**GPUIX** is a Solid renderer for GPUI, Zed's GPU-accelerated UI framework. It renders native desktop interfaces through Metal, DirectX, or Vulkan. No Electron or web view.`;
const ARCHITECTURE = `Solid sends host mutations through napi-rs. Rust keeps the retained tree and translates it into GPUI elements for each frame.`;
const SELECTION = `Selection is rebuilt from the paint pass. Each string registers in document order, so a drag can cross elements.`;
const SELECTION_CODE = `pub fn resolve_spans(
    elements: &[(&str, &str)],
    a: (usize, usize),
    b: (usize, usize),
) -> Vec<Span> {
    let (start, end) = if a <= b { (a, b) } else { (b, a) };
    let mut spans = Vec::new();
    for (ei, (key, text)) in elements.iter().enumerate().take(end.0 + 1).skip(start.0) {
        let from = if ei == start.0 { start.1 } else { 0 };
        let to = if ei == end.0 { end.1 } else { text.len() };
        if from < to {
            spans.push(Span { key: key.to_string(), range: from..to });
        }
    }
    spans
}`;
const GUTTER = `The gutter width now follows the largest line number, so a five-digit line no longer hits the accent bar.`;
const GUTTER_DIFF = ["diff --git a/packages/native/src/diff/mod.rs b/packages/native/src/diff/mod.rs", "index 8f2a1c4..d91b7e0 100644", "--- a/packages/native/src/diff/mod.rs", "+++ b/packages/native/src/diff/mod.rs", "@@ -78,12 +78,15 @@ impl FileDiff {", " /// Width of one line-number gutter, fitted to the largest line number.", "-pub fn gutter_width(file: &FileDiff) -> f32 {", "-    GUTTER_WIDTH", "+pub fn gutter_width(file: &FileDiff, metrics: &Metrics) -> f32 {", "+    let digits = file.max_line.max(1).ilog10() + 1;", "+    (digits as f32 * 6.6 + 8.0 + 6.0).max(metrics.diff_gutter_width)", " }"].join("\n");
const HOT_RELOAD = `**No.** A \`.node\` cannot unload. The loop rebuilds and restarts.`;
const SKILLS = `Skills are \`SKILL.md\` files. A mail-style list on the left, the body on the right.`;
const WIRE_MODELS = `Default is DeepSeek V4 Flash. Keep Opus for long diffs. Hide GPT-5.4 behind the picker.`;
const SDK_VS_GPUI = `GPUI is the renderer. A native SDK would still talk to it. GPUIX is the Solid layer on that same GPUI tree, so you keep JSX and skip a second UI stack.`;
const SCRIPT_C = `scriptc is a Vercel Labs experiment. This demo has no live runtime for it. The chat still shows how a coding agent would walk that kind of patch in GPUIX.`;
const MEMORY = `The chat example keeps one retained Solid child per turn. Pass \`itemCount\` and a window when the list grows. Native paint stays on visible rows only.`;
const TURNS = [{
  kind: "user",
  text: "give me a quick overview"
}, {
  kind: "fold",
  duration: "Worked for 10 seconds"
}, {
  kind: "markdown",
  source: OVERVIEW
}, {
  kind: "user",
  text: "How does Solid reach GPUI?"
}, {
  kind: "fold",
  duration: "Worked for 6 seconds"
}, {
  kind: "markdown",
  source: ARCHITECTURE
}, {
  kind: "user",
  text: "How does cross-element text selection work?"
}, {
  kind: "fold",
  duration: "Worked for 14 seconds"
}, {
  kind: "markdown",
  source: SELECTION
}, {
  kind: "code",
  language: "rust",
  source: SELECTION_CODE
}, {
  kind: "user",
  text: "Make the diff gutter width adapt to the largest line number."
}, {
  kind: "fold",
  duration: "Worked for 8 seconds"
}, {
  kind: "markdown",
  source: GUTTER
}, {
  kind: "diff",
  patch: GUTTER_DIFF
}, {
  kind: "user",
  text: "Do I get hot reload when I edit the Rust side?"
}, {
  kind: "fold",
  duration: "Worked for 4 seconds"
}, {
  kind: "markdown",
  source: HOT_RELOAD
}, {
  kind: "user",
  text: "How do skills show up in the app?"
}, {
  kind: "fold",
  duration: "Worked for 7 seconds"
}, {
  kind: "markdown",
  source: SKILLS
}, {
  kind: "user",
  text: "Which models should I wire up?"
}, {
  kind: "fold",
  duration: "Worked for 5 seconds"
}, {
  kind: "markdown",
  source: WIRE_MODELS
}];
const CONVERSATIONS = [{
  id: "c1",
  title: "give me a quick overview",
  group: "Yesterday",
  project: "gpuix",
  time: "16m",
  turns: TURNS
}, {
  id: "c2",
  title: "Native SDK vs GPUI comparison",
  group: "Yesterday",
  project: "No project",
  time: "14h",
  turns: [{
    kind: "user",
    text: "Native SDK vs GPUI comparison"
  }, {
    kind: "fold",
    duration: "Worked for 9 seconds"
  }, {
    kind: "markdown",
    source: SDK_VS_GPUI
  }]
}, {
  id: "c3",
  title: "Vercel Labs scriptc implementat...",
  group: "Yesterday",
  project: "No project",
  time: "15h",
  turns: [{
    kind: "user",
    text: "Vercel Labs scriptc implementation notes"
  }, {
    kind: "fold",
    duration: "Worked for 12 seconds"
  }, {
    kind: "markdown",
    source: SCRIPT_C
  }]
}, {
  id: "c4",
  title: "check if any memory optimizatio...",
  group: "This Month",
  project: "gpuix",
  time: "2d",
  turns: [{
    kind: "user",
    text: "check if any memory optimizations are left"
  }, {
    kind: "fold",
    duration: "Worked for 11 seconds"
  }, {
    kind: "markdown",
    source: MEMORY
  }]
}];
function IconButton(props) {
  return _$createComponent(Button, {
    get testId() {
      return props.testId;
    },
    get disabled() {
      return props.dimmed;
    },
    get style() {
      return {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: props.dimmed ? 0.35 : 1,
        hover: props.dimmed ? undefined : {
          backgroundColor: C.overlay
        },
        active: props.dimmed ? undefined : {
          backgroundColor: C.overlayStrong
        }
      };
    },
    onClick: () => props.onClick?.(),
    get children() {
      return _$createComponent(Icon, {
        get name() {
          return props.icon;
        },
        get size() {
          return props.size ?? 14;
        },
        get color() {
          return C.tertiary;
        }
      });
    }
  });
}
function SidebarAction(props) {
  return _$createComponent(Button, {
    get testId() {
      return props.testId;
    },
    onClick: () => props.onClick?.(),
    get style() {
      return {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 32,
        paddingLeft: 4,
        paddingRight: 4,
        borderRadius: 7,
        cursor: "pointer",
        hover: {
          backgroundColor: C.item
        },
        active: {
          backgroundColor: C.overlayStrong
        }
      };
    },
    get children() {
      return [(() => {
        var _el$2 = _$createElement("div");
        _$setProp(_el$2, "style", {
          width: 20,
          height: 20,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        });
        _$insert(_el$2, _$createComponent(Icon, {
          get name() {
            return props.icon;
          },
          size: 14,
          get color() {
            return C.secondary;
          }
        }));
        return _el$2;
      })(), (() => {
        var _el$3 = _$createElement("text");
        _$insert(_el$3, () => props.label);
        _$effect(_$p => _$setProp(_el$3, "style", {
          fontSize: 13,
          color: C.secondary
        }, _$p));
        return _el$3;
      })()];
    }
  });
}
function ConversationRow(props) {
  return _$createComponent(Button, {
    get testId() {
      return `thread-${props.conversation.id}`;
    },
    get style() {
      return {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 7,
        paddingBottom: 7,
        borderRadius: 7,
        cursor: "pointer",
        backgroundColor: props.active ? C.item : "#00000000",
        hover: {
          backgroundColor: C.item
        }
      };
    },
    onClick: () => props.onSelect(props.conversation.id),
    get children() {
      return [(() => {
        var _el$4 = _$createElement("text");
        _$insert(_el$4, () => props.conversation.title);
        _$effect(_$p => _$setProp(_el$4, "style", {
          fontSize: 13.5,
          lineHeight: 18,
          color: C.text,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis"
        }, _$p));
        return _el$4;
      })(), (() => {
        var _el$5 = _$createElement("div"),
          _el$6 = _$createElement("text"),
          _el$7 = _$createElement("text");
        _$insertNode(_el$5, _el$6);
        _$insertNode(_el$5, _el$7);
        _$setProp(_el$5, "style", {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 5
        });
        _$insert(_el$5, _$createComponent(Icon, {
          name: "folder",
          size: 12.5,
          get color() {
            return C.tertiary;
          }
        }), _el$6);
        _$insert(_el$6, () => props.conversation.project);
        _$insert(_el$7, () => props.conversation.time);
        _$effect(_p$ => {
          var _v$3 = {
              fontSize: 13,
              lineHeight: 15,
              color: C.tertiary,
              flexGrow: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            },
            _v$4 = {
              fontSize: 12.5,
              color: C.ghost,
              flexShrink: 0
            };
          _v$3 !== _p$.e && (_p$.e = _$setProp(_el$6, "style", _v$3, _p$.e));
          _v$4 !== _p$.t && (_p$.t = _$setProp(_el$7, "style", _v$4, _p$.t));
          return _p$;
        }, {
          e: undefined,
          t: undefined
        });
        return _el$5;
      })()];
    }
  });
}
function Sidebar(props) {
  const groups = createMemo(() => {
    const out = [];
    for (const conversation of props.conversations) {
      const last = out[out.length - 1];
      if (last && last.name === conversation.group) last.items.push(conversation);else out.push({
        name: conversation.group,
        items: [conversation]
      });
    }
    return out;
  });
  return (() => {
    var _el$8 = _$createElement("div"),
      _el$9 = _$createElement("div"),
      _el$0 = _$createElement("div"),
      _el$1 = _$createElement("div"),
      _el$10 = _$createElement("div"),
      _el$11 = _$createElement("div"),
      _el$12 = _$createElement("div"),
      _el$13 = _$createElement("div");
    _$insertNode(_el$8, _el$9);
    _$insertNode(_el$8, _el$10);
    _$insertNode(_el$8, _el$11);
    _$insertNode(_el$8, _el$13);
    _$insertNode(_el$9, _el$0);
    _$insertNode(_el$9, _el$1);
    _$setProp(_el$9, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      height: 48,
      flexShrink: 0
    });
    _$setProp(_el$0, "style", {
      width: TRAFFIC_LIGHT_CLEARANCE,
      height: "100%",
      flexShrink: 0
    });
    _$insert(_el$9, _$createComponent(IconButton, {
      icon: "sidebar",
      size: 16,
      testId: "sidebar-collapse",
      get onClick() {
        return props.onCollapse;
      }
    }), _el$1);
    _$setProp(_el$1, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginLeft: 6
    });
    _$insert(_el$1, _$createComponent(IconButton, {
      icon: "arrowLeft",
      get dimmed() {
        return !props.canGoBack;
      },
      testId: "history-back",
      get onClick() {
        return props.onBack;
      }
    }), null);
    _$insert(_el$1, _$createComponent(IconButton, {
      icon: "arrowRight",
      get dimmed() {
        return !props.canGoForward;
      },
      testId: "history-forward",
      get onClick() {
        return props.onForward;
      }
    }), null);
    _$setProp(_el$10, "style", {
      display: "flex",
      flexDirection: "column",
      paddingLeft: 10,
      paddingRight: 10
    });
    _$insert(_el$10, _$createComponent(SidebarAction, {
      icon: "compose",
      label: "New Task",
      testId: "new-task",
      get onClick() {
        return props.onNewTask;
      }
    }));
    _$insertNode(_el$11, _el$12);
    _$setProp(_el$11, "style", {
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      minHeight: 0,
      overflowY: "scroll",
      paddingLeft: 10,
      paddingRight: 10
    });
    _$setProp(_el$12, "style", {
      paddingBottom: 6
    });
    _$insert(_el$12, _$createComponent(SidebarAction, {
      icon: "search",
      label: "Search",
      testId: "search",
      get onClick() {
        return props.onSearch;
      }
    }));
    _$insert(_el$11, _$createComponent(For, {
      get each() {
        return groups();
      },
      children: (group, groupIndex) => (() => {
        var _el$14 = _$createElement("div"),
          _el$15 = _$createElement("div"),
          _el$16 = _$createElement("text");
        _$insertNode(_el$14, _el$15);
        _$setProp(_el$14, "style", {
          display: "flex",
          flexDirection: "column",
          paddingBottom: 10
        });
        _$insertNode(_el$15, _el$16);
        _$setProp(_el$15, "style", {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          height: 28,
          paddingLeft: 8,
          paddingRight: 8
        });
        _$insert(_el$16, () => group.name);
        _$insert(_el$15, _$createComponent(Show, {
          get when() {
            return groupIndex() === 0;
          },
          get children() {
            return _$createComponent(Button, {
              testId: "thread-filter",
              "aria-label": "Filter by project",
              onClick: () => props.onFilter(),
              get style() {
                return {
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backgroundColor: props.filterActive ? C.overlayStrong : "#00000000",
                  hover: {
                    backgroundColor: C.overlay
                  }
                };
              },
              get children() {
                return _$createComponent(Icon, {
                  name: "listFilter",
                  size: 14,
                  get color() {
                    return _$memo(() => !!props.filterActive)() ? C.text : C.secondary;
                  }
                });
              }
            });
          }
        }), null);
        _$insert(_el$14, _$createComponent(For, {
          get each() {
            return group.items;
          },
          children: conversation => _$createComponent(ConversationRow, {
            conversation: conversation,
            get active() {
              return conversation.id === props.activeId;
            },
            get onSelect() {
              return props.onSelect;
            }
          })
        }), null);
        _$effect(_$p => _$setProp(_el$16, "style", {
          fontSize: 13,
          fontWeight: 500,
          color: C.secondary,
          flexGrow: 1,
          minWidth: 0
        }, _$p));
        return _el$14;
      })()
    }), null);
    _$setProp(_el$13, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      flexShrink: 0,
      paddingLeft: 10,
      paddingRight: 10
    });
    _$insert(_el$13, _$createComponent(IconButton, {
      icon: "settings",
      testId: "settings",
      get onClick() {
        return props.onSettings;
      }
    }));
    _$effect(_$p => _$setProp(_el$8, "style", {
      display: "flex",
      flexDirection: "column",
      width: 252,
      flexShrink: 0,
      height: "100%",
      backgroundColor: C.sidebar,
      userSelect: "none"
    }, _$p));
    return _el$8;
  })();
}
function UserTurn(props) {
  return (() => {
    var _el$17 = _$createElement("div"),
      _el$18 = _$createElement("div"),
      _el$19 = _$createElement("text");
    _$insertNode(_el$17, _el$18);
    _$setProp(_el$17, "style", {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      width: "100%"
    });
    _$insertNode(_el$18, _el$19);
    _$insert(_el$19, () => props.text);
    _$effect(_p$ => {
      var _v$5 = {
          maxWidth: 540,
          minWidth: 0,
          backgroundColor: C.raised,
          borderRadius: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12
        },
        _v$6 = {
          fontSize: 14,
          lineHeight: 20,
          color: C.text,
          minWidth: 0,
          maxWidth: "100%"
        };
      _v$5 !== _p$.e && (_p$.e = _$setProp(_el$18, "style", _v$5, _p$.e));
      _v$6 !== _p$.t && (_p$.t = _$setProp(_el$19, "style", _v$6, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$17;
  })();
}
function WorkedFor(props) {
  const [open, setOpen] = createSignal(false);
  return (() => {
    var _el$20 = _$createElement("div");
    _$setProp(_el$20, "style", {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%"
    });
    _$insert(_el$20, _$createComponent(Button, {
      get ["aria-expanded"]() {
        return open();
      },
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 24,
        width: "100%",
        cursor: "pointer"
      },
      onClick: () => setOpen(value => !value),
      get children() {
        return [(() => {
          var _el$21 = _$createElement("div");
          _$effect(_$p => _$setProp(_el$21, "style", {
            height: 1,
            flexGrow: 1,
            backgroundColor: C.border
          }, _$p));
          return _el$21;
        })(), (() => {
          var _el$22 = _$createElement("div"),
            _el$23 = _$createElement("text");
          _$insertNode(_el$22, _el$23);
          _$setProp(_el$22, "style", {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            flexShrink: 0
          });
          _$insert(_el$23, () => props.duration);
          _$insert(_el$22, _$createComponent(Icon, {
            get name() {
              return open() ? "chevronDown" : "chevronRight";
            },
            size: 11.5,
            get color() {
              return C.tertiary;
            }
          }), null);
          _$effect(_$p => _$setProp(_el$23, "style", {
            fontSize: 13.5,
            lineHeight: 18,
            fontWeight: 500,
            color: C.tertiary
          }, _$p));
          return _el$22;
        })(), (() => {
          var _el$24 = _$createElement("div");
          _$effect(_$p => _$setProp(_el$24, "style", {
            height: 1,
            flexGrow: 1,
            backgroundColor: C.border
          }, _$p));
          return _el$24;
        })()];
      }
    }), null);
    _$insert(_el$20, _$createComponent(Show, {
      get when() {
        return open();
      },
      get children() {
        var _el$25 = _$createElement("text");
        _$insertNode(_el$25, _$createTextNode(`Demo reasoning. No model ran. The fold is here so the chrome has something to open.`));
        _$effect(_$p => _$setProp(_el$25, "style", {
          fontSize: 13,
          lineHeight: 18,
          color: C.secondary
        }, _$p));
        return _el$25;
      }
    }), null);
    return _el$20;
  })();
}
const ROW_INNER_STYLE = {
  width: CONTENT_MAX_WIDTH,
  maxWidth: "100%"
};
const ROW_STYLE = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  width: "100%",
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 20,
  paddingRight: 20
};
const ROW_STYLE_FIRST = {
  ...ROW_STYLE,
  paddingTop: 22
};
const ROW_STYLE_LAST = {
  ...ROW_STYLE,
  paddingBottom: 22
};
const ROW_STYLE_ONLY = {
  ...ROW_STYLE,
  paddingTop: 22,
  paddingBottom: 22
};
function TranscriptRow(props) {
  const style = () => props.first && props.last ? ROW_STYLE_ONLY : props.first ? ROW_STYLE_FIRST : props.last ? ROW_STYLE_LAST : ROW_STYLE;
  return (() => {
    var _el$27 = _$createElement("div"),
      _el$28 = _$createElement("div");
    _$insertNode(_el$27, _el$28);
    _$setProp(_el$28, "style", ROW_INNER_STYLE);
    _$insert(_el$28, () => props.children);
    _$effect(_$p => _$setProp(_el$27, "style", style(), _$p));
    return _el$27;
  })();
}
const CODE_CARD_STYLE = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: C.border,
  backgroundColor: "#FFFFFF09",
  overflow: "hidden"
};
const CODE_HEADER_STYLE = {
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 5,
  paddingBottom: 5,
  borderBottomWidth: 1,
  borderColor: C.border,
  backgroundColor: "#FFFFFF05"
};
const CODE_BODY_STYLE = {
  minWidth: 0,
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 10,
  paddingBottom: 10
};
function CodeBlock(props) {
  return (() => {
    var _el$29 = _$createElement("div"),
      _el$32 = _$createElement("code");
    _$insertNode(_el$29, _el$32);
    _$setProp(_el$29, "style", CODE_CARD_STYLE);
    _$insert(_el$29, _$createComponent(Show, {
      get when() {
        return props.language;
      },
      get children() {
        var _el$30 = _$createElement("div"),
          _el$31 = _$createElement("text");
        _$insertNode(_el$30, _el$31);
        _$setProp(_el$30, "style", CODE_HEADER_STYLE);
        _$insert(_el$31, () => props.language);
        _$effect(_$p => _$setProp(_el$31, "style", {
          fontSize: 12,
          color: C.secondary
        }, _$p));
        return _el$30;
      }
    }), _el$32);
    _$setProp(_el$32, "theme", CHAT_THEME);
    _$setProp(_el$32, "style", CODE_BODY_STYLE);
    _$effect(_p$ => {
      var _v$7 = props.code,
        _v$8 = props.language,
        _v$9 = props.showLineNumbers;
      _v$7 !== _p$.e && (_p$.e = _$setProp(_el$32, "code", _v$7, _p$.e));
      _v$8 !== _p$.t && (_p$.t = _$setProp(_el$32, "language", _v$8, _p$.t));
      _v$9 !== _p$.a && (_p$.a = _$setProp(_el$32, "showLineNumbers", _v$9, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$29;
  })();
}
function Markdown(props) {
  return (() => {
    var _el$33 = _$createElement("div"),
      _el$34 = _$createElement("markdown");
    _$insertNode(_el$33, _el$34);
    _$setProp(_el$33, "style", {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      minWidth: 0
    });
    _$setProp(_el$34, "theme", CHAT_THEME);
    _$effect(_$p => _$setProp(_el$34, "source", props.source, _$p));
    return _el$33;
  })();
}
function expandTurns(count) {
  if (count <= TURNS.length) return TURNS.slice(0, count);
  const out = new Array(count);
  for (let i = 0; i < count; i++) out[i] = TURNS[i % TURNS.length];
  return out;
}
function seedTurnsFor(id, turnCount) {
  if (id === "c1") return expandTurns(turnCount);
  return CONVERSATIONS.find(conversation => conversation.id === id)?.turns.slice() ?? [];
}
function demoReply(args) {
  const quoted = args.text.length > 80 ? `${args.text.slice(0, 77)}...` : args.text;
  const modeLine = args.mode === "plan" ? "Plan mode is on, so this is a sketch, not a patch." : "Build mode is on. This still stays in the demo.";
  return [{
    kind: "fold",
    duration: "Worked for 2 seconds"
  }, {
    kind: "markdown",
    source: `This is the GPUIX chat demo. No model ran. You wrote "${quoted}". ${args.modelLabel} would answer here. ${modeLine}`
  }];
}
function titleFromDraft(text) {
  const first = text.trim().split(/\s+/).slice(0, 6).join(" ");
  return first.length > 42 ? `${first.slice(0, 39)}...` : first;
}
function Inspector(props) {
  const rows = createMemo(() => {
    const modelLabel = MODELS.find(item => item.id === props.model)?.label ?? props.model;
    const reasoningLabel = REASONING.find(item => item.id === props.reasoning)?.label ?? props.reasoning;
    const accessLabel = ACCESS.find(item => item.id === props.access)?.label ?? props.access;
    const projectLabel = PROJECTS.find(item => item.id === props.project)?.label ?? props.project;
    return [["Thread", props.conversation?.title ?? "New task"], ["Project", projectLabel], ["Model", modelLabel], ["Reasoning", reasoningLabel], ["Access", accessLabel], ["Mode", props.mode === "plan" ? "Plan" : "Build"], ["Turns", String(props.conversation?.turns.length ?? 0)]];
  });
  return (() => {
    var _el$35 = _$createElement("div"),
      _el$36 = _$createElement("text");
    _$insertNode(_el$35, _el$36);
    _$insertNode(_el$36, _$createTextNode(`Inspector`));
    _$insert(_el$35, _$createComponent(For, {
      get each() {
        return rows();
      },
      children: ([label, value]) => (() => {
        var _el$38 = _$createElement("div"),
          _el$39 = _$createElement("text"),
          _el$40 = _$createElement("text");
        _$insertNode(_el$38, _el$39);
        _$insertNode(_el$38, _el$40);
        _$setProp(_el$38, "style", {
          display: "flex",
          flexDirection: "column",
          gap: 2
        });
        _$insert(_el$39, label);
        _$insert(_el$40, value);
        _$effect(_p$ => {
          var _v$10 = {
              fontSize: 11.5,
              color: C.ghost
            },
            _v$11 = {
              fontSize: 13,
              color: C.secondary
            };
          _v$10 !== _p$.e && (_p$.e = _$setProp(_el$39, "style", _v$10, _p$.e));
          _v$11 !== _p$.t && (_p$.t = _$setProp(_el$40, "style", _v$11, _p$.t));
          return _p$;
        }, {
          e: undefined,
          t: undefined
        });
        return _el$38;
      })()
    }), null);
    _$effect(_p$ => {
      var _v$0 = {
          display: "flex",
          flexDirection: "column",
          width: 260,
          flexShrink: 0,
          height: "100%",
          backgroundColor: C.sidebar,
          borderLeftWidth: 1,
          borderColor: C.sidebarBorder,
          paddingTop: 14,
          paddingLeft: 14,
          paddingRight: 14,
          gap: 10
        },
        _v$1 = {
          fontSize: 13,
          fontWeight: 600,
          color: C.text
        };
      _v$0 !== _p$.e && (_p$.e = _$setProp(_el$35, "style", _v$0, _p$.e));
      _v$1 !== _p$.t && (_p$.t = _$setProp(_el$36, "style", _v$1, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$35;
  })();
}

// @gpuix/solid does not export its element class; take it from a ref signature.

/** A modal card. Dialog owns Escape, the backdrop press, the Tab trap, and
 *  moving focus in on open and back out on close. */
function OverlayCard(props) {
  return _$createComponent(Dialog, {
    get open() {
      return props.open;
    },
    onOpenChange: next => !next && props.onClose(),
    get children() {
      return _$createComponent(DialogPortal, {
        get children() {
          return [_$createComponent(DialogBackdrop, {
            style: {
              backgroundColor: "#00000066"
            }
          }), _$createComponent(DialogPopup, {
            get initialFocus() {
              return props.initialFocus;
            },
            get style() {
              return {
                width: 420,
                height: props.height,
                maxWidth: "90%",
                backgroundColor: C.raised,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.borderStrong,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12
              };
            },
            get children() {
              return [(() => {
                var _el$41 = _$createElement("div");
                _$setProp(_el$41, "style", {
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center"
                });
                _$insert(_el$41, _$createComponent(DialogTitle, {
                  style: {
                    flexGrow: 1
                  },
                  get children() {
                    var _el$42 = _$createElement("text");
                    _$insert(_el$42, () => props.title);
                    _$effect(_$p => _$setProp(_el$42, "style", {
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text
                    }, _$p));
                    return _el$42;
                  }
                }), null);
                _$insert(_el$41, _$createComponent(DialogClose, {
                  testId: "overlay-close",
                  get style() {
                    return {
                      height: 24,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      hover: {
                        backgroundColor: C.overlay
                      }
                    };
                  },
                  get children() {
                    var _el$43 = _$createElement("text");
                    _$insertNode(_el$43, _$createTextNode(`Close`));
                    _$effect(_$p => _$setProp(_el$43, "style", {
                      fontSize: 12,
                      color: C.secondary
                    }, _$p));
                    return _el$43;
                  }
                }), null);
                return _el$41;
              })(), _$memo(() => props.children)];
            }
          })];
        }
      });
    }
  });
}

// A turn's `kind` never changes within a row, so build its body once with a
// plain switch. Using per-kind <Show> would retain five computations per row.
function turnBody(turn) {
  switch (turn.kind) {
    case "user":
      return _$createComponent(UserTurn, {
        get text() {
          return turn.text;
        }
      });
    case "fold":
      return _$createComponent(WorkedFor, {
        get duration() {
          return turn.duration;
        }
      });
    case "markdown":
      return _$createComponent(Markdown, {
        get source() {
          return turn.source;
        }
      });
    case "code":
      return _$createComponent(CodeBlock, {
        get code() {
          return turn.source;
        },
        get language() {
          return turn.language;
        },
        showLineNumbers: true
      });
    case "diff":
      return (() => {
        var _el$45 = _$createElement("diff");
        _$setProp(_el$45, "wordDiff", true);
        _$setProp(_el$45, "theme", CHAT_THEME);
        _$effect(_$p => _$setProp(_el$45, "patch", turn.patch, _$p));
        return _el$45;
      })();
  }
}
function Transcript(props) {
  return (() => {
    var _el$46 = _$createElement("virtual-list");
    var _ref$ = props.listRef;
    typeof _ref$ === "function" ? _$use(_ref$, _el$46) : props.listRef = _el$46;
    _$setProp(_el$46, "overdraw", 240);
    _$setProp(_el$46, "estimatedItemHeight", 220);
    _$setProp(_el$46, "style", {
      flexGrow: 1,
      minHeight: 0,
      width: "100%"
    });
    _$insert(_el$46, _$createComponent(For, {
      get each() {
        return props.turns;
      },
      children: (turn, index) => _$createComponent(TranscriptRow, {
        get first() {
          return index() === 0;
        },
        get last() {
          return index() === props.turns.length - 1;
        },
        get children() {
          return [_$memo(() => turnBody(turn)), _$createComponent(Show, {
            get when() {
              return _$memo(() => index() === props.turns.length - 1)() && turn.kind !== "user";
            },
            get children() {
              return _$createComponent(ActionBar, {
                get onRetry() {
                  return props.onRetry;
                }
              });
            }
          })];
        }
      })
    }));
    return _el$46;
  })();
}
function Header(props) {
  return (() => {
    var _el$47 = _$createElement("div"),
      _el$51 = _$createElement("text"),
      _el$54 = _$createElement("div");
    _$insertNode(_el$47, _el$51);
    _$insertNode(_el$47, _el$54);
    _$insert(_el$47, _$createComponent(Show, {
      get when() {
        return props.collapsed;
      },
      get children() {
        return [(() => {
          var _el$48 = _$createElement("div");
          _$setProp(_el$48, "style", {
            width: TRAFFIC_LIGHT_CLEARANCE - 8,
            height: "100%",
            flexShrink: 0
          });
          return _el$48;
        })(), (() => {
          var _el$49 = _$createElement("div"),
            _el$50 = _$createElement("div");
          _$insertNode(_el$49, _el$50);
          _$setProp(_el$49, "style", {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6
          });
          _$insert(_el$49, _$createComponent(IconButton, {
            icon: "sidebar",
            testId: "sidebar-expand",
            get onClick() {
              return props.onExpand;
            }
          }), _el$50);
          _$setProp(_el$50, "style", {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 2
          });
          _$insert(_el$50, _$createComponent(IconButton, {
            icon: "arrowLeft",
            get dimmed() {
              return !props.canGoBack;
            },
            get onClick() {
              return props.onBack;
            }
          }), null);
          _$insert(_el$50, _$createComponent(IconButton, {
            icon: "arrowRight",
            get dimmed() {
              return !props.canGoForward;
            },
            get onClick() {
              return props.onForward;
            }
          }), null);
          return _el$49;
        })()];
      }
    }), _el$51);
    _$insert(_el$51, () => props.title);
    _$insert(_el$47, _$createComponent(Show, {
      get when() {
        return props.turnCount > TURNS.length;
      },
      get children() {
        var _el$52 = _$createElement("text"),
          _el$53 = _$createTextNode(` messages`);
        _$insertNode(_el$52, _el$53);
        _$insert(_el$52, () => props.turnCount.toLocaleString("en-US"), _el$53);
        _$effect(_$p => _$setProp(_el$52, "style", {
          fontSize: 12,
          fontWeight: 500,
          color: C.tertiary,
          whiteSpace: "nowrap",
          flexShrink: 0
        }, _$p));
        return _el$52;
      }
    }), _el$54);
    _$setProp(_el$54, "style", {
      flexGrow: 1
    });
    _$insert(_el$47, _$createComponent(IconButton, {
      icon: "panelRight",
      testId: "inspector-toggle",
      get onClick() {
        return props.onToggleInspector;
      }
    }), null);
    _$effect(_p$ => {
      var _v$12 = {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 48,
          flexShrink: 0,
          paddingLeft: props.collapsed ? 0 : 14,
          paddingRight: 14,
          userSelect: "none"
        },
        _v$13 = {
          fontSize: 13,
          fontWeight: 500,
          color: C.text,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          minWidth: 0,
          flexShrink: 1
        };
      _v$12 !== _p$.e && (_p$.e = _$setProp(_el$47, "style", _v$12, _p$.e));
      _v$13 !== _p$.t && (_p$.t = _$setProp(_el$51, "style", _v$13, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$47;
  })();
}
const MENU = {
  minWidth: 220,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  paddingRight: 4,
  backgroundColor: C.raised,
  borderWidth: 1,
  borderColor: C.borderStrong,
  borderRadius: 12
};
function menuItemStyle(state, description) {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingTop: description ? 6 : 5,
    paddingBottom: description ? 6 : 5,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 7,
    backgroundColor: state.highlighted ? "#404040" : state.selected ? "#2C2C2C" : C.raised,
    hover: {
      backgroundColor: "#404040"
    },
    cursor: "pointer"
  };
}
function MenuRowInner(props) {
  return [_$createComponent(Show, {
    get when() {
      return props.icon;
    },
    children: icon => _$createComponent(Icon, {
      get name() {
        return icon();
      },
      size: 14,
      get color() {
        return C.tertiary;
      }
    })
  }), (() => {
    var _el$55 = _$createElement("div"),
      _el$56 = _$createElement("text");
    _$insertNode(_el$55, _el$56);
    _$setProp(_el$55, "style", {
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      minWidth: 0
    });
    _$insert(_el$56, () => props.label);
    _$insert(_el$55, _$createComponent(Show, {
      get when() {
        return props.description;
      },
      get children() {
        var _el$57 = _$createElement("text");
        _$insert(_el$57, () => props.description);
        _$effect(_$p => _$setProp(_el$57, "style", {
          fontSize: 12.5,
          lineHeight: 14,
          color: C.tertiary,
          paddingTop: 2
        }, _$p));
        return _el$57;
      }
    }), null);
    _$effect(_$p => _$setProp(_el$56, "style", {
      fontSize: 12.5,
      fontWeight: props.selected ? 600 : 500,
      color: C.text,
      whiteSpace: "nowrap",
      textOverflow: "ellipsis"
    }, _$p));
    return _el$55;
  })(), _$createComponent(Show, {
    get when() {
      return props.hint;
    },
    get children() {
      var _el$58 = _$createElement("text");
      _$insert(_el$58, () => props.hint);
      _$effect(_$p => _$setProp(_el$58, "style", {
        fontSize: 11.5,
        color: C.ghost,
        flexShrink: 0
      }, _$p));
      return _el$58;
    }
  }), _$createComponent(Show, {
    get when() {
      return props.selected;
    },
    get children() {
      return _$createComponent(Icon, {
        name: "check",
        size: 11,
        get color() {
          return C.tertiary;
        }
      });
    }
  })];
}
function ChipSelect(props) {
  return _$createComponent(Select, {
    get items() {
      return props.items;
    },
    get value() {
      return props.value;
    },
    get onValueChange() {
      return props.onChange;
    },
    style: {
      flexShrink: 0
    },
    get children() {
      var _el$59 = _$createElement("div");
      _$setProp(_el$59, "style", {
        position: "relative",
        display: "flex"
      });
      _$insert(_el$59, _$createComponent(SelectTrigger, {
        get testId() {
          return props.testId;
        },
        style: state => ({
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 26,
          paddingLeft: 7,
          paddingRight: 7,
          borderRadius: 6,
          cursor: "pointer",
          backgroundColor: state.open ? C.overlay : "#00000000",
          hover: {
            backgroundColor: C.overlay
          }
        }),
        get children() {
          return [_$createComponent(Icon, {
            get name() {
              return props.icon;
            },
            size: 12,
            get color() {
              return _$memo(() => !!props.accent)() ? C.accent : C.tertiary;
            }
          }), (() => {
            var _el$60 = _$createElement("text");
            _$insert(_el$60, () => props.label);
            _$effect(_$p => _$setProp(_el$60, "style", {
              fontSize: 13,
              lineHeight: 16,
              color: props.accent ? C.accent : C.secondary,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }, _$p));
            return _el$60;
          })(), _$createComponent(Show, {
            get when() {
              return props.caret ?? true;
            },
            get children() {
              return _$createComponent(Icon, {
                name: "chevronDown",
                size: 10.5,
                get color() {
                  return C.ghost;
                }
              });
            }
          })];
        }
      }), null);
      _$insert(_el$59, _$createComponent(SelectContent, {
        side: "top",
        sideOffset: 4,
        get style() {
          return {
            ...MENU,
            minWidth: props.menuWidth ?? 220
          };
        },
        get children() {
          return props.children;
        }
      }), null);
      return _el$59;
    }
  });
}
function ModelPicker(props) {
  const selected = () => MODELS.find(model => model.id === props.value) ?? MODELS[0];
  const groups = createMemo(() => {
    const out = [];
    for (const model of MODELS) {
      const last = out[out.length - 1];
      if (last && last.name === model.group) last.items.push(model);else out.push({
        name: model.group,
        items: [model]
      });
    }
    return out;
  });
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return MODELS.map(model => ({
        value: model.id,
        label: model.label
      }));
    },
    get icon() {
      return selected().icon;
    },
    get label() {
      return selected().label;
    },
    testId: "model-picker",
    get children() {
      return _$createComponent(For, {
        get each() {
          return groups();
        },
        children: (group, index) => (() => {
          var _el$61 = _$createElement("div");
          _$setProp(_el$61, "style", {
            display: "flex",
            flexDirection: "column"
          });
          _$insert(_el$61, _$createComponent(Show, {
            get when() {
              return index() > 0;
            },
            get children() {
              var _el$62 = _$createElement("div");
              _$effect(_$p => _$setProp(_el$62, "style", {
                height: 1,
                backgroundColor: C.border,
                marginTop: 4,
                marginBottom: 4
              }, _$p));
              return _el$62;
            }
          }), null);
          _$insert(_el$61, _$createComponent(SelectLabel, {
            style: {
              height: 22,
              paddingLeft: 8,
              paddingRight: 8,
              display: "flex",
              alignItems: "center"
            },
            get children() {
              var _el$63 = _$createElement("text");
              _$insert(_el$63, () => group.name);
              _$effect(_$p => _$setProp(_el$63, "style", {
                fontSize: 11.5,
                fontWeight: 500,
                color: C.ghost
              }, _$p));
              return _el$63;
            }
          }), null);
          _$insert(_el$61, _$createComponent(For, {
            get each() {
              return group.items;
            },
            children: model => _$createComponent(SelectItem, {
              get value() {
                return model.id;
              },
              get testId() {
                return `model-${model.id}`;
              },
              style: state => menuItemStyle(state),
              children: state => _$createComponent(MenuRowInner, {
                get label() {
                  return model.label;
                },
                get icon() {
                  return model.icon;
                },
                get selected() {
                  return state.selected;
                }
              })
            })
          }), null);
          return _el$61;
        })()
      });
    }
  });
}
function ReasoningPicker(props) {
  const selected = () => REASONING.find(option => option.id === props.value) ?? REASONING[0];
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return REASONING.map(option => ({
        value: option.id,
        label: option.label
      }));
    },
    get icon() {
      return props.value === "low" ? "zap" : "sparkle";
    },
    get label() {
      return selected().label;
    },
    caret: false,
    get children() {
      return [_$createComponent(SelectLabel, {
        style: {
          height: 22,
          paddingLeft: 8,
          display: "flex",
          alignItems: "center"
        },
        get children() {
          var _el$64 = _$createElement("text");
          _$insertNode(_el$64, _$createTextNode(`Reasoning`));
          _$effect(_$p => _$setProp(_el$64, "style", {
            fontSize: 11.5,
            fontWeight: 500,
            color: C.ghost
          }, _$p));
          return _el$64;
        }
      }), _$createComponent(For, {
        each: REASONING,
        children: option => _$createComponent(SelectItem, {
          get value() {
            return option.id;
          },
          get testId() {
            return `reasoning-${option.id}`;
          },
          style: state => menuItemStyle(state),
          children: state => _$createComponent(MenuRowInner, {
            get label() {
              return option.label;
            },
            get hint() {
              return option.hint;
            },
            get selected() {
              return state.selected;
            }
          })
        })
      })];
    }
  });
}
function AccessPicker(props) {
  const selected = () => ACCESS.find(option => option.id === props.value) ?? ACCESS[3];
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return ACCESS.map(option => ({
        value: option.id,
        label: option.label
      }));
    },
    get icon() {
      return selected().icon;
    },
    get label() {
      return selected().label;
    },
    caret: false,
    menuWidth: 288,
    get children() {
      return _$createComponent(For, {
        each: ACCESS,
        children: option => _$createComponent(SelectItem, {
          get value() {
            return option.id;
          },
          get testId() {
            return `access-${option.id}`;
          },
          style: state => menuItemStyle(state, true),
          children: state => _$createComponent(MenuRowInner, {
            get label() {
              return option.label;
            },
            get description() {
              return option.description;
            },
            get icon() {
              return option.icon;
            },
            get selected() {
              return state.selected;
            }
          })
        })
      });
    }
  });
}
function ProjectPicker(props) {
  const selected = () => PROJECTS.find(option => option.id === props.value) ?? PROJECTS[0];
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return PROJECTS.map(option => ({
        value: option.id,
        label: option.label
      }));
    },
    icon: "folder",
    get label() {
      return selected().label;
    },
    caret: false,
    get children() {
      return _$createComponent(For, {
        each: PROJECTS,
        children: option => _$createComponent(SelectItem, {
          get value() {
            return option.id;
          },
          get testId() {
            return `project-${option.id}`;
          },
          style: state => menuItemStyle(state),
          children: state => _$createComponent(MenuRowInner, {
            get label() {
              return option.label;
            },
            icon: "folder",
            get selected() {
              return state.selected;
            }
          })
        })
      });
    }
  });
}
function WorkspacePicker(props) {
  const selected = () => WORKSPACES.find(option => option.id === props.value) ?? WORKSPACES[0];
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return WORKSPACES.map(option => ({
        value: option.id,
        label: option.label
      }));
    },
    get icon() {
      return selected().icon;
    },
    get label() {
      return selected().label;
    },
    caret: false,
    get children() {
      return [_$createComponent(SelectLabel, {
        style: {
          height: 22,
          paddingLeft: 8,
          display: "flex",
          alignItems: "center"
        },
        get children() {
          var _el$66 = _$createElement("text");
          _$insertNode(_el$66, _$createTextNode(`Work in`));
          _$effect(_$p => _$setProp(_el$66, "style", {
            fontSize: 11.5,
            fontWeight: 500,
            color: C.ghost
          }, _$p));
          return _el$66;
        }
      }), _$createComponent(For, {
        each: WORKSPACES,
        children: option => _$createComponent(SelectItem, {
          get value() {
            return option.id;
          },
          get testId() {
            return `workspace-${option.id}`;
          },
          style: state => menuItemStyle(state),
          children: state => _$createComponent(MenuRowInner, {
            get label() {
              return option.label;
            },
            get icon() {
              return option.icon;
            },
            get selected() {
              return state.selected;
            }
          })
        })
      })];
    }
  });
}
function BranchPicker(props) {
  const selected = () => BRANCHES.find(option => option.id === props.value) ?? BRANCHES[0];
  return _$createComponent(ChipSelect, {
    get value() {
      return props.value;
    },
    get onChange() {
      return props.onChange;
    },
    get items() {
      return BRANCHES.map(option => ({
        value: option.id,
        label: option.label
      }));
    },
    icon: "gitBranch",
    get label() {
      return selected().label;
    },
    get children() {
      return _$createComponent(For, {
        each: BRANCHES,
        children: option => _$createComponent(SelectItem, {
          get value() {
            return option.id;
          },
          get testId() {
            return `branch-${option.id}`;
          },
          style: state => menuItemStyle(state),
          children: state => _$createComponent(MenuRowInner, {
            get label() {
              return option.label;
            },
            icon: "gitBranch",
            get selected() {
              return state.selected;
            }
          })
        })
      });
    }
  });
}
function ModeToggle(props) {
  const plan = () => props.value === "plan";
  return _$createComponent(Button, {
    "aria-label": "Mode",
    get style() {
      return {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 26,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 6,
        cursor: "pointer",
        hover: {
          backgroundColor: C.overlay
        }
      };
    },
    onClick: () => props.onChange(plan() ? "build" : "plan"),
    get children() {
      return [_$createComponent(Icon, {
        get name() {
          return plan() ? "list" : "wrench";
        },
        size: 12,
        get color() {
          return _$memo(() => !!plan())() ? C.accent : C.tertiary;
        }
      }), (() => {
        var _el$68 = _$createElement("text");
        _$insert(_el$68, () => plan() ? "Plan" : "Build");
        _$effect(_$p => _$setProp(_el$68, "style", {
          fontSize: 13,
          lineHeight: 16,
          color: plan() ? C.accent : C.secondary
        }, _$p));
        return _el$68;
      })()];
    }
  });
}
function Composer(props) {
  let composerEl;
  const context = useGpuix();
  createEffect(() => {
    props.focusTick;
    const id = composerEl?.id;
    if (id == null) return;
    context?.renderer?.focusElement?.(id);
  });
  const ready = () => props.value.trim().length > 0;
  const send = text => {
    const next = text.trim();
    if (!next) return;
    props.onSend(next);
  };
  return (() => {
    var _el$69 = _$createElement("div"),
      _el$70 = _$createElement("div"),
      _el$71 = _$createElement("textarea"),
      _el$72 = _$createElement("div"),
      _el$73 = _$createElement("div"),
      _el$74 = _$createElement("div");
    _$insertNode(_el$69, _el$70);
    _$setProp(_el$69, "style", {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0,
      paddingLeft: 20,
      paddingRight: 20,
      overflow: "visible",
      userSelect: "none"
    });
    _$insertNode(_el$70, _el$71);
    _$insertNode(_el$70, _el$72);
    _$use(el => composerEl = el, _el$71);
    _$setProp(_el$71, "testId", "composer");
    _$setProp(_el$71, "placeholder", "Do anything...");
    _$setProp(_el$71, "minRows", 1);
    _$setProp(_el$71, "maxRows", 3);
    _$setProp(_el$71, "autoFocus", true);
    _$setProp(_el$71, "theme", CHAT_THEME);
    _$setProp(_el$71, "onChange", event => props.onChange(event.value ?? ""));
    _$setProp(_el$71, "onSubmit", event => send(event.value ?? props.value));
    _$insertNode(_el$72, _el$73);
    _$insertNode(_el$72, _el$74);
    _$setProp(_el$72, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
      paddingLeft: 10,
      paddingRight: 10
    });
    _$insert(_el$72, _$createComponent(ModelPicker, {
      get value() {
        return props.model;
      },
      get onChange() {
        return props.onModelChange;
      }
    }), _el$73);
    _$insert(_el$72, _$createComponent(ReasoningPicker, {
      get value() {
        return props.reasoning;
      },
      get onChange() {
        return props.onReasoningChange;
      }
    }), _el$73);
    _$insert(_el$72, _$createComponent(AccessPicker, {
      get value() {
        return props.access;
      },
      get onChange() {
        return props.onAccessChange;
      }
    }), _el$73);
    _$insert(_el$72, _$createComponent(ModeToggle, {
      get value() {
        return props.mode;
      },
      get onChange() {
        return props.onModeChange;
      }
    }), _el$73);
    _$setProp(_el$73, "style", {
      flexGrow: 1
    });
    _$setProp(_el$74, "testId", "send");
    _$setProp(_el$74, "onClick", () => send(props.value));
    _$insert(_el$74, _$createComponent(Icon, {
      name: "send",
      size: 16,
      get color() {
        return _$memo(() => !!ready())() ? C.onInverse : C.ghost;
      }
    }));
    _$effect(_p$ => {
      var _v$14 = {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 720,
          overflow: "visible",
          backgroundColor: C.composer,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: C.border,
          paddingTop: 10,
          paddingBottom: 10
        },
        _v$15 = props.value,
        _v$16 = {
          width: "100%",
          minWidth: 0,
          fontSize: 14,
          lineHeight: 20,
          color: C.text,
          backgroundColor: "#00000000",
          borderWidth: 0,
          paddingLeft: 10,
          paddingRight: 10
        },
        _v$17 = {
          width: 26,
          height: 26,
          borderRadius: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: ready() ? "pointer" : undefined,
          backgroundColor: ready() ? C.inverse : C.overlayStrong,
          hover: ready() ? {
            opacity: 0.9
          } : undefined
        };
      _v$14 !== _p$.e && (_p$.e = _$setProp(_el$70, "style", _v$14, _p$.e));
      _v$15 !== _p$.t && (_p$.t = _$setProp(_el$71, "value", _v$15, _p$.t));
      _v$16 !== _p$.a && (_p$.a = _$setProp(_el$71, "style", _v$16, _p$.a));
      _v$17 !== _p$.o && (_p$.o = _$setProp(_el$74, "style", _v$17, _p$.o));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$69;
  })();
}
function WorkspaceFooter(props) {
  return (() => {
    var _el$75 = _$createElement("div"),
      _el$76 = _$createElement("div"),
      _el$77 = _$createElement("div"),
      _el$78 = _$createElement("div");
    _$insertNode(_el$75, _el$76);
    _$setProp(_el$75, "style", {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0,
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 4,
      paddingBottom: 8,
      userSelect: "none"
    });
    _$insertNode(_el$76, _el$77);
    _$insertNode(_el$76, _el$78);
    _$setProp(_el$76, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      width: "100%",
      maxWidth: 720,
      height: 28,
      paddingLeft: 10,
      paddingRight: 10
    });
    _$insert(_el$76, _$createComponent(ProjectPicker, {
      get value() {
        return props.project;
      },
      get onChange() {
        return props.onProjectChange;
      }
    }), _el$77);
    _$insert(_el$76, _$createComponent(WorkspacePicker, {
      get value() {
        return props.workspace;
      },
      get onChange() {
        return props.onWorkspaceChange;
      }
    }), _el$77);
    _$insert(_el$76, _$createComponent(Show, {
      get when() {
        return props.project !== "none";
      },
      get children() {
        return _$createComponent(BranchPicker, {
          get value() {
            return props.branch;
          },
          get onChange() {
            return props.onBranchChange;
          }
        });
      }
    }), _el$77);
    _$setProp(_el$77, "style", {
      flexGrow: 1
    });
    _$setProp(_el$78, "style", {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#3B82F6",
      flexShrink: 0
    });
    return _el$75;
  })();
}
function GhostButton(props) {
  const color = () => props.active ? C.text : C.ghost;
  return _$createComponent(Button, {
    get testId() {
      return props.testId;
    },
    get style() {
      return {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 30,
        paddingLeft: props.label ? 9 : 0,
        paddingRight: props.label ? 11 : 0,
        width: props.label ? undefined : 30,
        justifyContent: "center",
        borderRadius: 10,
        cursor: "pointer",
        backgroundColor: props.active ? C.overlayStrong : "#00000000",
        hover: {
          backgroundColor: C.overlay
        }
      };
    },
    onClick: () => props.onClick?.(),
    get children() {
      return [_$createComponent(Icon, {
        get name() {
          return props.icon;
        },
        size: 16,
        get color() {
          return color();
        }
      }), _$createComponent(Show, {
        get when() {
          return props.label;
        },
        get children() {
          var _el$79 = _$createElement("text");
          _$insert(_el$79, () => props.label);
          _$effect(_$p => _$setProp(_el$79, "style", {
            fontSize: 12.5,
            color: color()
          }, _$p));
          return _el$79;
        }
      })];
    }
  });
}
function ActionBar(props) {
  const [copied, setCopied] = createSignal(false);
  const [feedback, setFeedback] = createSignal(null);
  const [note, setNote] = createSignal(null);
  return (() => {
    var _el$80 = _$createElement("div"),
      _el$81 = _$createElement("div");
    _$insertNode(_el$80, _el$81);
    _$setProp(_el$80, "style", {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 4,
      paddingTop: 6,
      marginLeft: -7,
      userSelect: "none"
    });
    _$setProp(_el$81, "style", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4
    });
    _$insert(_el$81, _$createComponent(GhostButton, {
      get icon() {
        return copied() ? "check" : "copy";
      },
      get active() {
        return copied();
      },
      onClick: () => {
        setCopied(true);
        setNote("Copied. Clipboard is a demo in this example.");
      }
    }), null);
    _$insert(_el$81, _$createComponent(GhostButton, {
      icon: "thumbsUp",
      get active() {
        return feedback() === "up";
      },
      onClick: () => {
        setFeedback(value => value === "up" ? null : "up");
        setNote(null);
      }
    }), null);
    _$insert(_el$81, _$createComponent(GhostButton, {
      icon: "thumbsDown",
      get active() {
        return feedback() === "down";
      },
      onClick: () => {
        setFeedback(value => value === "down" ? null : "down");
        setNote(null);
      }
    }), null);
    _$insert(_el$81, _$createComponent(GhostButton, {
      icon: "retry",
      testId: "retry",
      onClick: () => {
        props.onRetry?.();
        setNote("Ran the demo reply again.");
      }
    }), null);
    _$insert(_el$81, _$createComponent(GhostButton, {
      icon: "share",
      onClick: () => setNote("Share is a demo. No link left this window.")
    }), null);
    _$insert(_el$81, _$createComponent(GhostButton, {
      icon: "more",
      onClick: () => setNote("More actions are a demo.")
    }), null);
    _$insert(_el$80, _$createComponent(Show, {
      get when() {
        return note();
      },
      get children() {
        var _el$82 = _$createElement("text");
        _$insert(_el$82, note);
        _$effect(_$p => _$setProp(_el$82, "style", {
          fontSize: 12,
          color: C.tertiary,
          paddingLeft: 9
        }, _$p));
        return _el$82;
      }
    }), null);
    return _el$80;
  })();
}
export function ChatApp(propsIn = {}) {
  const turnCount = propsIn.turnCount ?? TURNS.length;
  const [conversations, setConversations] = createSignal(CONVERSATIONS.map(conversation => ({
    ...conversation,
    turns: seedTurnsFor(conversation.id, turnCount)
  })));
  const [activeId, setActiveId] = createSignal("c1");
  const [nav, setNav] = createSignal({
    stack: ["c1"],
    index: 0
  });
  const [collapsed, setCollapsed] = createSignal(false);
  const [inspectorOpen, setInspectorOpen] = createSignal(false);
  const [overlay, setOverlay] = createSignal(null);
  let searchInput;
  const [query, setQuery] = createSignal("");
  const [projectOnly, setProjectOnly] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [model, setModel] = createSignal("deepseek-v4-flash");
  const [reasoning, setReasoning] = createSignal("high");
  const [access, setAccess] = createSignal("full");
  const [mode, setMode] = createSignal("build");
  const [project, setProject] = createSignal("gpuix");
  const [workspace, setWorkspace] = createSignal("local");
  const [branch, setBranch] = createSignal("main");
  const [tailTick, setTailTick] = createSignal(0);
  const [focusTick, setFocusTick] = createSignal(0);
  let listEl;
  let nextTask = 1;
  const context = useGpuix();
  const insets = createWindowInsets();
  const active = createMemo(() => conversations().find(conversation => conversation.id === activeId()));
  const turns = createMemo(() => active()?.turns ?? []);
  const canGoBack = () => nav().index > 0;
  const canGoForward = () => nav().index < nav().stack.length - 1;
  const projectLabel = () => PROJECTS.find(item => item.id === project())?.label ?? project();
  const visibleConversations = createMemo(() => projectOnly() ? conversations().filter(conversation => conversation.project === projectLabel()) : conversations());
  const searchHits = createMemo(() => {
    const q = query().trim().toLowerCase();
    return q ? conversations().filter(conversation => conversation.title.toLowerCase().includes(q)) : conversations();
  });
  const goTo = id => {
    setOverlay(null);
    if (id === activeId()) {
      setFocusTick(value => value + 1);
      return;
    }
    setActiveId(id);
    setNav(current => ({
      stack: current.stack.slice(0, current.index + 1).concat(id),
      index: current.index + 1
    }));
    setFocusTick(value => value + 1);
  };
  const goBack = () => {
    const current = nav();
    if (current.index === 0) return;
    const index = current.index - 1;
    setActiveId(current.stack[index]);
    setNav({
      ...current,
      index
    });
    setFocusTick(value => value + 1);
  };
  const goForward = () => {
    const current = nav();
    if (current.index >= current.stack.length - 1) return;
    const index = current.index + 1;
    setActiveId(current.stack[index]);
    setNav({
      ...current,
      index
    });
    setFocusTick(value => value + 1);
  };
  createEffect(() => {
    if (tailTick() === 0) return;
    const id = listEl?.id;
    const renderer = context?.renderer;
    if (id == null || !renderer?.scrollToItem) return;
    renderer.scrollToItem(id, Math.max(0, turns().length - 1));
  });
  return (() => {
    var _el$83 = _$createElement("div"),
      _el$85 = _$createElement("div");
    _$insertNode(_el$83, _el$85);
    _$insert(_el$83, _$createComponent(motion.div, {
      initial: false,
      get animate() {
        return {
          width: collapsed() ? 0 : SIDEBAR_WIDTH + 1
        };
      },
      transition: {
        duration: 0.2,
        ease: "easeOut"
      },
      style: {
        display: "flex",
        flexDirection: "row",
        height: "100%",
        flexShrink: 0,
        overflow: "hidden"
      },
      get children() {
        return [_$createComponent(Sidebar, {
          get conversations() {
            return visibleConversations();
          },
          get activeId() {
            return activeId();
          },
          onSelect: goTo,
          onCollapse: () => setCollapsed(true),
          onNewTask: () => {
            const id = `task-${nextTask++}`;
            const created = {
              id,
              title: "New task",
              group: "Today",
              project: projectLabel(),
              time: "now",
              turns: []
            };
            setConversations(current => [created, ...current]);
            setDraft("");
            goTo(id);
          },
          onSearch: () => {
            setQuery("");
            setOverlay("search");
          },
          get canGoBack() {
            return canGoBack();
          },
          get canGoForward() {
            return canGoForward();
          },
          onBack: goBack,
          onForward: goForward,
          onSettings: () => setOverlay("settings"),
          onFilter: () => setProjectOnly(value => !value),
          get filterActive() {
            return projectOnly();
          }
        }), (() => {
          var _el$84 = _$createElement("div");
          _$effect(_$p => _$setProp(_el$84, "style", {
            width: 1,
            height: "100%",
            flexShrink: 0,
            backgroundColor: C.sidebarBorder
          }, _$p));
          return _el$84;
        })()];
      }
    }), _el$85);
    _$insert(_el$85, _$createComponent(Header, {
      get collapsed() {
        return collapsed();
      },
      onExpand: () => setCollapsed(false),
      get title() {
        return active()?.title ?? "New task";
      },
      get turnCount() {
        return turns().length;
      },
      get canGoBack() {
        return canGoBack();
      },
      get canGoForward() {
        return canGoForward();
      },
      onBack: goBack,
      onForward: goForward,
      onToggleInspector: () => setInspectorOpen(value => !value)
    }), null);
    _$insert(_el$85, _$createComponent(Transcript, {
      get turns() {
        return turns();
      },
      listRef: el => listEl = el,
      onRetry: () => {
        const list = turns();
        let cut = -1;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i]?.kind === "user") {
            cut = i;
            break;
          }
        }
        const lastUser = cut >= 0 ? list[cut] : undefined;
        if (!lastUser || lastUser.kind !== "user") return;
        const modelLabel = MODELS.find(item => item.id === model())?.label ?? model();
        const reply = demoReply({
          text: lastUser.text,
          modelLabel,
          mode: mode()
        });
        setConversations(current => current.map(conversation => conversation.id === activeId() ? {
          ...conversation,
          turns: [...conversation.turns.slice(0, cut + 1), ...reply]
        } : conversation));
        setTailTick(value => value + 1);
      }
    }), null);
    _$insert(_el$85, _$createComponent(Composer, {
      get value() {
        return draft();
      },
      onChange: setDraft,
      get focusTick() {
        return focusTick();
      },
      onSend: text => {
        const modelLabel = MODELS.find(item => item.id === model())?.label ?? model();
        const reply = demoReply({
          text,
          modelLabel,
          mode: mode()
        });
        setConversations(current => current.map(conversation => conversation.id === activeId() ? {
          ...conversation,
          title: conversation.turns.length === 0 ? titleFromDraft(text) : conversation.title,
          turns: [...conversation.turns, {
            kind: "user",
            text
          }, ...reply]
        } : conversation));
        setDraft("");
        setTailTick(value => value + 1);
      },
      get model() {
        return model();
      },
      onModelChange: setModel,
      get reasoning() {
        return reasoning();
      },
      onReasoningChange: setReasoning,
      get access() {
        return access();
      },
      onAccessChange: setAccess,
      get mode() {
        return mode();
      },
      onModeChange: setMode
    }), null);
    _$insert(_el$85, _$createComponent(WorkspaceFooter, {
      get project() {
        return project();
      },
      onProjectChange: setProject,
      get workspace() {
        return workspace();
      },
      onWorkspaceChange: setWorkspace,
      get branch() {
        return branch();
      },
      onBranchChange: setBranch
    }), null);
    _$insert(_el$83, _$createComponent(Show, {
      get when() {
        return inspectorOpen();
      },
      get children() {
        return _$createComponent(Inspector, {
          get conversation() {
            return active();
          },
          get model() {
            return model();
          },
          get reasoning() {
            return reasoning();
          },
          get access() {
            return access();
          },
          get mode() {
            return mode();
          },
          get project() {
            return project();
          }
        });
      }
    }), null);
    _$insert(_el$83, _$createComponent(OverlayCard, {
      title: "Search threads",
      height: 420,
      get open() {
        return overlay() === "search";
      },
      onClose: () => setOverlay(null),
      initialFocus: () => searchInput,
      get children() {
        return [(() => {
          var _el$86 = _$createElement("input");
          var _ref$2 = searchInput;
          typeof _ref$2 === "function" ? _$use(_ref$2, _el$86) : searchInput = _el$86;
          _$setProp(_el$86, "testId", "search-input");
          _$setProp(_el$86, "placeholder", "Filter by title");
          _$setProp(_el$86, "theme", CHAT_THEME);
          _$setProp(_el$86, "onChange", event => setQuery(event.value ?? ""));
          _$effect(_p$ => {
            var _v$18 = query(),
              _v$19 = {
                width: "100%",
                height: 32,
                flexShrink: 0,
                fontSize: 13,
                color: C.text,
                backgroundColor: C.composer,
                borderRadius: 8,
                paddingLeft: 10,
                paddingRight: 10
              };
            _v$18 !== _p$.e && (_p$.e = _$setProp(_el$86, "value", _v$18, _p$.e));
            _v$19 !== _p$.t && (_p$.t = _$setProp(_el$86, "style", _v$19, _p$.t));
            return _p$;
          }, {
            e: undefined,
            t: undefined
          });
          return _el$86;
        })(), (() => {
          var _el$87 = _$createElement("div");
          _$setProp(_el$87, "style", {
            flexGrow: 1,
            minHeight: 0,
            overflowY: "scroll"
          });
          _$insert(_el$87, _$createComponent(For, {
            get each() {
              return searchHits();
            },
            children: conversation => _$createComponent(Button, {
              get testId() {
                return `search-${conversation.id}`;
              },
              onClick: () => goTo(conversation.id),
              get style() {
                return {
                  paddingTop: 8,
                  paddingBottom: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderRadius: 8,
                  cursor: "pointer",
                  hover: {
                    backgroundColor: C.overlay
                  }
                };
              },
              get children() {
                var _el$92 = _$createElement("text");
                _$insert(_el$92, () => conversation.title);
                _$effect(_$p => _$setProp(_el$92, "style", {
                  fontSize: 13,
                  color: C.text
                }, _$p));
                return _el$92;
              }
            })
          }));
          return _el$87;
        })()];
      }
    }), null);
    _$insert(_el$83, _$createComponent(OverlayCard, {
      title: "Settings",
      get open() {
        return overlay() === "settings";
      },
      onClose: () => setOverlay(null),
      get children() {
        return [(() => {
          var _el$88 = _$createElement("text");
          _$insertNode(_el$88, _$createTextNode(`This is the GPUIX chat demo. Threads, drafts, and replies stay in this window.`));
          _$effect(_$p => _$setProp(_el$88, "style", {
            fontSize: 13,
            lineHeight: 18,
            color: C.secondary
          }, _$p));
          return _el$88;
        })(), _$createComponent(Button, {
          testId: "cycle-overlay",
          onClick: () => context?.renderer?.cycleDebugFrameOverlay?.(),
          get style() {
            return {
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              paddingLeft: 10,
              cursor: "pointer",
              backgroundColor: C.overlay,
              hover: {
                backgroundColor: C.overlayStrong
              }
            };
          },
          get children() {
            var _el$90 = _$createElement("text");
            _$insertNode(_el$90, _$createTextNode(`Cycle frame overlay`));
            _$effect(_$p => _$setProp(_el$90, "style", {
              fontSize: 13,
              color: C.text
            }, _$p));
            return _el$90;
          }
        })];
      }
    }), null);
    _$effect(_p$ => {
      var _v$20 = {
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          backgroundColor: C.canvas,
          fontFamily: FONT_SANS,
          color: C.text,
          position: "relative"
        },
        _v$21 = {
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
          height: "100%",
          paddingBottom: insets().ime.bottom,
          backgroundColor: C.canvas
        };
      _v$20 !== _p$.e && (_p$.e = _$setProp(_el$83, "style", _v$20, _p$.e));
      _v$21 !== _p$.t && (_p$.t = _$setProp(_el$85, "style", _v$21, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$83;
  })();
}
const isEntryPoint = typeof Bun !== "undefined" ? Bun.isStandaloneExecutable || Bun.main === import.meta.path : typeof process !== "undefined" && process.argv[1]?.endsWith("chat.tsx");
if (isEntryPoint) {
  render(() => _$createComponent(ChatApp, {
    turnCount: 1_000
  }), {
    title: "GPUIX Chat · Solid · 1,000 messages",
    width: 1180,
    height: 820,
    titlebarTransparent: true,
    windowBackground: "blurred",
    trafficLightX: 16,
    trafficLightY: 17,
    debugFrameOverlay: "full",
    focus: process.env.GPUIX_BACKGROUND !== "1"
  });
}