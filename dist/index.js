var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/solid-js/dist/solid.js
var sharedConfig = {
  context: void 0,
  registry: void 0,
  effects: void 0,
  done: false,
  getContextId() {
    return getContextId(this.context.count);
  },
  getNextContextId() {
    return getContextId(this.context.count++);
  }
};
function getContextId(count) {
  const num = String(count), len = num.length - 1;
  return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
}
function setHydrateContext(context) {
  sharedConfig.context = context;
}
function nextHydrateContext() {
  return {
    ...sharedConfig.context,
    id: sharedConfig.getNextContextId(),
    count: 0
  };
}
var IS_DEV = false;
var equalFn = (a, b) => a === b;
var $PROXY = Symbol("solid-proxy");
var SUPPORTS_PROXY = typeof Proxy === "function";
var signalOptions = {
  equals: equalFn
};
var ERROR = null;
var runEffects = runQueue;
var STALE = 1;
var PENDING = 2;
var UNOWNED = {
  };
var Owner = null;
var Transition = null;
var Scheduler = null;
var ExternalSourceConfig = null;
var Listener = null;
var Updates = null;
var Effects = null;
var ExecCount = 0;
function createSignal(value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const s = {
    value,
    observers: null,
    observerSlots: null,
    comparator: options.equals || void 0
  };
  const setter = (value2) => {
    if (typeof value2 === "function") {
      if (Transition && Transition.running && Transition.sources.has(s)) value2 = value2(s.tValue);
      else value2 = value2(s.value);
    }
    return writeSignal(s, value2);
  };
  return [readSignal.bind(s), setter];
}
function createRenderEffect(fn, value, options) {
  const c = createComputation(fn, value, false, STALE);
  if (Scheduler && Transition && Transition.running) Updates.push(c);
  else updateComputation(c);
}
function createMemo(fn, value, options) {
  options = options ? Object.assign({}, signalOptions, options) : signalOptions;
  const c = createComputation(fn, value, true, 0);
  c.observers = null;
  c.observerSlots = null;
  c.comparator = options.equals || void 0;
  if (Scheduler && Transition && Transition.running) {
    c.tState = STALE;
    Updates.push(c);
  } else updateComputation(c);
  return readSignal.bind(c);
}
function untrack(fn) {
  if (!ExternalSourceConfig && Listener === null) return fn();
  const listener = Listener;
  Listener = null;
  try {
    if (ExternalSourceConfig) return ExternalSourceConfig.untrack(fn);
    return fn();
  } finally {
    Listener = listener;
  }
}
function onCleanup(fn) {
  if (Owner === null) ;
  else if (Owner.cleanups === null) Owner.cleanups = [fn];
  else Owner.cleanups.push(fn);
  return fn;
}
function startTransition(fn) {
  if (Transition && Transition.running) {
    fn();
    return Transition.done;
  }
  const l = Listener;
  const o = Owner;
  return Promise.resolve().then(() => {
    Listener = l;
    Owner = o;
    let t;
    if (Scheduler || SuspenseContext) {
      t = Transition || (Transition = {
        sources: /* @__PURE__ */ new Set(),
        effects: [],
        promises: /* @__PURE__ */ new Set(),
        disposed: /* @__PURE__ */ new Set(),
        queue: /* @__PURE__ */ new Set(),
        running: true
      });
      t.done || (t.done = new Promise((res) => t.resolve = res));
      t.running = true;
    }
    runUpdates(fn);
    Listener = Owner = null;
    return t ? t.done : void 0;
  });
}
var [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
var SuspenseContext;
function readSignal() {
  const runningTransition = Transition && Transition.running;
  if (this.sources && (runningTransition ? this.tState : this.state)) {
    if ((runningTransition ? this.tState : this.state) === STALE) updateComputation(this);
    else {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(this));
      Updates = updates;
    }
  }
  if (Listener) {
    const sSlot = this.observers ? this.observers.length : 0;
    if (!Listener.sources) {
      Listener.sources = [this];
      Listener.sourceSlots = [sSlot];
    } else {
      Listener.sources.push(this);
      Listener.sourceSlots.push(sSlot);
    }
    if (!this.observers) {
      this.observers = [Listener];
      this.observerSlots = [Listener.sources.length - 1];
    } else {
      this.observers.push(Listener);
      this.observerSlots.push(Listener.sources.length - 1);
    }
  }
  if (runningTransition && Transition.sources.has(this)) return this.tValue;
  return this.value;
}
function writeSignal(node, value, isComp) {
  let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
  if (!node.comparator || !node.comparator(current, value)) {
    if (Transition) {
      const TransitionRunning = Transition.running;
      if (TransitionRunning || !isComp && Transition.sources.has(node)) {
        Transition.sources.add(node);
        node.tValue = value;
      }
      if (!TransitionRunning) node.value = value;
    } else node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          const TransitionRunning = Transition && Transition.running;
          if (TransitionRunning && Transition.disposed.has(o)) continue;
          if (TransitionRunning ? !o.tState : !o.state) {
            if (o.pure) Updates.push(o);
            else Effects.push(o);
            if (o.observers) markDownstream(o);
          }
          if (!TransitionRunning) o.state = STALE;
          else o.tState = STALE;
        }
        if (Updates.length > 1e6) {
          Updates = [];
          if (IS_DEV) ;
          throw new Error();
        }
      });
    }
  }
  return value;
}
function updateComputation(node) {
  if (!node.fn) return;
  cleanNode(node);
  const time = ExecCount;
  runComputation(
    node,
    Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value,
    time
  );
  if (Transition && !Transition.running && Transition.sources.has(node)) {
    queueMicrotask(() => {
      runUpdates(() => {
        Transition && (Transition.running = true);
        Listener = Owner = node;
        runComputation(node, node.tValue, time);
        Listener = Owner = null;
      });
    });
  }
}
function runComputation(node, value, time) {
  let nextValue;
  const owner = Owner, listener = Listener;
  Listener = Owner = node;
  try {
    nextValue = node.fn(value);
  } catch (err) {
    if (node.pure) {
      if (Transition && Transition.running) {
        node.tState = STALE;
        node.tOwned && node.tOwned.forEach(cleanNode);
        node.tOwned = void 0;
      } else {
        node.state = STALE;
        node.owned && node.owned.forEach(cleanNode);
        node.owned = null;
      }
    }
    node.updatedAt = time + 1;
    return handleError(err);
  } finally {
    Listener = listener;
    Owner = owner;
  }
  if (!node.updatedAt || node.updatedAt <= time) {
    if (node.updatedAt != null && "observers" in node) {
      writeSignal(node, nextValue, true);
    } else if (Transition && Transition.running && node.pure) {
      Transition.sources.add(node);
      node.tValue = nextValue;
    } else node.value = nextValue;
    node.updatedAt = time;
  }
}
function createComputation(fn, init, pure, state = STALE, options) {
  const c = {
    fn,
    state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner: Owner,
    context: Owner ? Owner.context : null,
    pure
  };
  if (Transition && Transition.running) {
    c.state = 0;
    c.tState = state;
  }
  if (Owner === null) ;
  else if (Owner !== UNOWNED) {
    if (Transition && Transition.running && Owner.pure) {
      if (!Owner.tOwned) Owner.tOwned = [c];
      else Owner.tOwned.push(c);
    } else {
      if (!Owner.owned) Owner.owned = [c];
      else Owner.owned.push(c);
    }
  }
  if (ExternalSourceConfig && c.fn) {
    const [track, trigger] = createSignal(void 0, {
      equals: false
    });
    const ordinary = ExternalSourceConfig.factory(c.fn, trigger);
    onCleanup(() => ordinary.dispose());
    const triggerInTransition = () => startTransition(trigger).then(() => inTransition.dispose());
    const inTransition = ExternalSourceConfig.factory(c.fn, triggerInTransition);
    c.fn = (x) => {
      track();
      return Transition && Transition.running ? inTransition.track(x) : ordinary.track(x);
    };
  }
  return c;
}
function runTop(node) {
  const runningTransition = Transition && Transition.running;
  if ((runningTransition ? node.tState : node.state) === 0) return;
  if ((runningTransition ? node.tState : node.state) === PENDING) return lookUpstream(node);
  if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
  const ancestors = [node];
  while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
    if (runningTransition && Transition.disposed.has(node)) return;
    if (runningTransition ? node.tState : node.state) ancestors.push(node);
  }
  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i];
    if (runningTransition) {
      let top = node, prev = ancestors[i + 1];
      while ((top = top.owner) && top !== prev) {
        if (Transition.disposed.has(top)) return;
      }
    }
    if ((runningTransition ? node.tState : node.state) === STALE) {
      updateComputation(node);
    } else if ((runningTransition ? node.tState : node.state) === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]));
      Updates = updates;
    }
  }
}
function runUpdates(fn, init) {
  if (Updates) return fn();
  let wait = false;
  Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;
  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    handleError(err);
  }
}
function completeUpdates(wait) {
  if (Updates) {
    if (Scheduler && Transition && Transition.running) scheduleQueue(Updates);
    else runQueue(Updates);
    Updates = null;
  }
  if (wait) return;
  let res;
  if (Transition) {
    if (!Transition.promises.size && !Transition.queue.size) {
      const sources = Transition.sources;
      const disposed = Transition.disposed;
      Effects.push.apply(Effects, Transition.effects);
      res = Transition.resolve;
      for (const e2 of Effects) {
        "tState" in e2 && (e2.state = e2.tState);
        delete e2.tState;
      }
      Transition = null;
      runUpdates(() => {
        for (const d of disposed) cleanNode(d);
        for (const v of sources) {
          v.value = v.tValue;
          if (v.owned) {
            for (let i = 0, len = v.owned.length; i < len; i++) cleanNode(v.owned[i]);
          }
          if (v.tOwned) v.owned = v.tOwned;
          delete v.tValue;
          delete v.tOwned;
          v.tState = 0;
        }
        setTransPending(false);
      });
    } else if (Transition.running) {
      Transition.running = false;
      Transition.effects.push.apply(Transition.effects, Effects);
      Effects = null;
      setTransPending(true);
      return;
    }
  }
  const e = Effects;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e));
  if (res) res();
}
function runQueue(queue) {
  for (let i = 0; i < queue.length; i++) runTop(queue[i]);
}
function scheduleQueue(queue) {
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const tasks = Transition.queue;
    if (!tasks.has(item)) {
      tasks.add(item);
      Scheduler(() => {
        tasks.delete(item);
        runUpdates(() => {
          Transition.running = true;
          runTop(item);
        });
        Transition && (Transition.running = false);
      });
    }
  }
}
function lookUpstream(node, ignore) {
  const runningTransition = Transition && Transition.running;
  if (runningTransition) node.tState = 0;
  else node.state = 0;
  for (let i = 0; i < node.sources.length; i += 1) {
    const source = node.sources[i];
    if (source.sources) {
      const state = runningTransition ? source.tState : source.state;
      if (state === STALE) {
        if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
          runTop(source);
      } else if (state === PENDING) lookUpstream(source, ignore);
    }
  }
}
function markDownstream(node) {
  const runningTransition = Transition && Transition.running;
  for (let i = 0; i < node.observers.length; i += 1) {
    const o = node.observers[i];
    if (runningTransition ? !o.tState : !o.state) {
      if (runningTransition) o.tState = PENDING;
      else o.state = PENDING;
      if (o.pure) Updates.push(o);
      else Effects.push(o);
      o.observers && markDownstream(o);
    }
  }
}
function cleanNode(node) {
  let i;
  if (node.sources) {
    while (node.sources.length) {
      const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
      if (obs && obs.length) {
        const n = obs.pop(), s = source.observerSlots.pop();
        if (index < obs.length) {
          n.sourceSlots[s] = index;
          obs[index] = n;
          source.observerSlots[index] = s;
        }
      }
    }
  }
  if (node.tOwned) {
    for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
    delete node.tOwned;
  }
  if (Transition && Transition.running && node.pure) {
    reset(node, true);
  } else if (node.owned) {
    for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
    node.cleanups = null;
  }
  if (Transition && Transition.running) node.tState = 0;
  else node.state = 0;
}
function reset(node, top) {
  if (!top) {
    node.tState = 0;
    Transition.disposed.add(node);
  }
  if (node.owned) {
    for (let i = 0; i < node.owned.length; i++) reset(node.owned[i]);
  }
}
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function runErrors(err, fns, owner) {
  try {
    for (const f of fns) f(err);
  } catch (e) {
    handleError(e, owner && owner.owner || null);
  }
}
function handleError(err, owner = Owner) {
  const fns = ERROR && owner && owner.context && owner.context[ERROR];
  const error = castError(err);
  if (!fns) throw error;
  if (Effects)
    Effects.push({
      fn() {
        runErrors(error, fns, owner);
      },
      state: STALE
    });
  else runErrors(error, fns, owner);
}
var hydrationEnabled = false;
function createComponent(Comp, props) {
  if (hydrationEnabled) {
    if (sharedConfig.context) {
      const c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      const r = untrack(() => Comp(props || {}));
      setHydrateContext(c);
      return r;
    }
  }
  return untrack(() => Comp(props || {}));
}
function trueFn() {
  return true;
}
var propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    if (property === $PROXY) return true;
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return !(s = typeof s === "function" ? s() : s) ? {} : s;
}
function resolveSources() {
  for (let i = 0, length = this.length; i < length; ++i) {
    const v = this[i]();
    if (v !== void 0) return v;
  }
}
function mergeProps(...sources) {
  let proxy = false;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    proxy = proxy || !!s && $PROXY in s;
    sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
  }
  if (SUPPORTS_PROXY && proxy) {
    return new Proxy(
      {
        get(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            const v = resolveSource(sources[i])[property];
            if (v !== void 0) return v;
          }
        },
        has(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            if (property in resolveSource(sources[i])) return true;
          }
          return false;
        },
        keys() {
          const keys = [];
          for (let i = 0; i < sources.length; i++)
            keys.push(...Object.keys(resolveSource(sources[i])));
          return [...new Set(keys)];
        }
      },
      propTraps
    );
  }
  const sourcesMap = {};
  const defined = /* @__PURE__ */ Object.create(null);
  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source) continue;
    const sourceKeys = Object.getOwnPropertyNames(source);
    for (let i2 = sourceKeys.length - 1; i2 >= 0; i2--) {
      const key = sourceKeys[i2];
      if (key === "__proto__" || key === "constructor") continue;
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (!defined[key]) {
        defined[key] = desc.get ? {
          enumerable: true,
          configurable: true,
          get: resolveSources.bind(sourcesMap[key] = [desc.get.bind(source)])
        } : desc.value !== void 0 ? desc : void 0;
      } else {
        const sources2 = sourcesMap[key];
        if (sources2) {
          if (desc.get) sources2.push(desc.get.bind(source));
          else if (desc.value !== void 0) sources2.push(() => desc.value);
        }
      }
    }
  }
  const target = {};
  const definedKeys = Object.keys(defined);
  for (let i = definedKeys.length - 1; i >= 0; i--) {
    const key = definedKeys[i], desc = defined[key];
    if (desc && desc.get) Object.defineProperty(target, key, desc);
    else target[key] = desc ? desc.value : void 0;
  }
  return target;
}

// node_modules/solid-js/web/dist/web.js
var booleans = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected"
];
/* @__PURE__ */ new Set([
  "className",
  "value",
  "readOnly",
  "noValidate",
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  ...booleans
]);
var ChildProperties = /* @__PURE__ */ new Set([
  "innerHTML",
  "textContent",
  "innerText",
  "children"
]);
var Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  className: "class",
  htmlFor: "for"
});
var DelegatedEvents = /* @__PURE__ */ new Set([
  "beforeinput",
  "click",
  "dblclick",
  "contextmenu",
  "focusin",
  "focusout",
  "input",
  "keydown",
  "keyup",
  "mousedown",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "pointerdown",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerup",
  "touchend",
  "touchmove",
  "touchstart"
]);
var SVGNamespace = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace"
};
function reconcileArrays(parentNode, a, b) {
  let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) a[aStart].remove();
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }
      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart, sequence = 1, t;
          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }
          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else a[aStart++].remove();
    }
  }
}
var $$EVENTS = "_$DX_DELEGATE";
function template(html, isImportNode, isSVG, isMathML) {
  let node;
  const create = () => {
    const t = document.createElement("template");
    t.innerHTML = html;
    return t.content.firstChild;
  };
  const fn = () => (node || (node = create())).cloneNode(true);
  fn.cloneNode = fn;
  return fn;
}
function delegateEvents(eventNames, document2 = window.document) {
  const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document2.addEventListener(name, eventHandler);
    }
  }
}
function setAttribute(node, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}
function setAttributeNS(node, namespace, name, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value);
}
function setBoolAttribute(node, name, value) {
  if (isHydrating(node)) return;
  value ? node.setAttribute(name, "") : node.removeAttribute(name);
}
function className(node, value) {
  if (isHydrating(node)) return;
  if (value == null) node.removeAttribute("class");
  else node.className = value;
}
function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
  } else node.addEventListener(name, handler, typeof handler !== "function" && handler);
}
function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i], classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}
function style(node, value, prev) {
  if (!value) return prev ? setAttribute(node, "style") : value;
  const nodeStyle = node.style;
  if (typeof value === "string") return nodeStyle.cssText = value;
  typeof prev === "string" && (nodeStyle.cssText = prev = void 0);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}
function spread(node, props = {}, isSVG, skipChildren) {
  const prevProps = {};
  createRenderEffect(() => typeof props.ref === "function" && use(props.ref, node));
  createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
  return prevProps;
}
function use(fn, element, arg) {
  return untrack(() => fn(element, arg));
}
function insert(parent, accessor, marker, initial) {
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
}
function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
  }
}
function isHydrating(node) {
  return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
}
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}
function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}
function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
  let isCE, isProp, isChildProp, forceProp;
  if (prop === "style") return style(node, value, prev);
  if (prop === "classList") return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === "ref") {
    if (!skipRef) value(node);
  } else if (prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
    value && node.addEventListener(e, value, typeof value !== "function" && value);
  } else if (prop.slice(0, 10) === "oncapture:") {
    const e = prop.slice(10);
    prev && node.removeEventListener(e, prev, true);
    value && node.addEventListener(e, value, true);
  } else if (prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (prop.slice(0, 5) === "attr:") {
    setAttribute(node, prop.slice(5), value);
  } else if (prop.slice(0, 5) === "bool:") {
    setBoolAttribute(node, prop.slice(5), value);
  } else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || false || (isCE = node.nodeName.includes("-") || "is" in props)) {
    if (forceProp) {
      prop = prop.slice(5);
      isProp = true;
    } else if (isHydrating(node)) return value;
    if (prop === "class" || prop === "className") className(node, value);
    else if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
    else node[prop] = value;
  } else {
    const ns = prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);
    else setAttribute(node, Aliases[prop] || prop, value);
  }
  return value;
}
function eventHandler(e) {
  if (sharedConfig.registry && sharedConfig.events) {
    if (sharedConfig.events.find(([el, ev]) => ev === e)) return;
  }
  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = (value) => Object.defineProperty(e, "target", {
    configurable: true,
    value
  });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host)) ;
  };
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = _$HY.done = true;
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break;
      }
    }
  } else walkUpTree();
  retarget(oriTarget);
}
function insertExpression(parent, value, current, marker, unwrapArray) {
  const hydrating = isHydrating(parent);
  if (hydrating) {
    !current && (current = [...parent.childNodes]);
    let cleaned = [];
    for (let i = 0; i < current.length; i++) {
      const node = current[i];
      if (node.nodeType === 8 && node.data.slice(0, 2) === "!$") node.remove();
      else cleaned.push(node);
    }
    current = cleaned;
  }
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value;
  parent = parent;
  if (t === "string" || t === "number") {
    if (hydrating) return current;
    if (t === "number") {
      value = value.toString();
      if (value === current) return current;
    }
    {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (hydrating) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    createRenderEffect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    const currentArray = current && Array.isArray(current);
    if (normalizeIncomingArray(array, value, current, unwrapArray)) {
      createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
      return () => current;
    }
    if (hydrating) {
      if (!array.length) return current;
      return current = [...parent.childNodes];
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, array);
    }
    current = array;
  } else if (value.nodeType) {
    if (hydrating && value.parentNode) return current = value;
    if (Array.isArray(current)) {
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else ;
  return current;
}
function normalizeIncomingArray(normalized, array, current, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i], prev = current && current[normalized.length], t;
    if (item == null || item === true || item === false) ;
    else if ((t = typeof item) === "object" && item.nodeType) {
      normalized.push(item);
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic = normalizeIncomingArray(
          normalized,
          Array.isArray(item) ? item : [item],
          Array.isArray(prev) ? prev : [prev]
        ) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      const value = String(item);
      if (prev && prev.nodeType === 3 && prev.data === value) normalized.push(prev);
      else normalized.push(document.createTextNode(value));
    }
  }
  return dynamic;
}
function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}
function cleanChildren(parent, current, marker, replacement) {
  if (marker === void 0) return parent.textContent = "";
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && el.remove();
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}

// src/lib/mersenne_twister.ts
var MersenneTwister = function(seed) {
  if (seed === void 0) {
    seed = Math.floor(Math.random() * Math.pow(10, 13));
  }
  this.N = 624;
  this.M = 397;
  this.MATRIX_A = 2567483615;
  this.UPPER_MASK = 2147483648;
  this.LOWER_MASK = 2147483647;
  this.mt = new Array(this.N);
  this.mti = this.N + 1;
  this.init_genrand(seed);
};
MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti = 1; this.mti < this.N; this.mti++) {
    s = this.mt[this.mti - 1] ^ this.mt[this.mti - 1] >>> 30;
    this.mt[this.mti] = (((s & 4294901760) >>> 16) * 1812433253 << 16) + (s & 65535) * 1812433253 + this.mti;
    this.mt[this.mti] >>>= 0;
  }
};
MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
  var i = 1, j = 0, k, s;
  this.init_genrand(19650218);
  k = this.N > key_length ? this.N : key_length;
  for (; k; k--) {
    s = this.mt[i - 1] ^ this.mt[i - 1] >>> 30;
    this.mt[i] = (this.mt[i] ^ (((s & 4294901760) >>> 16) * 1664525 << 16) + (s & 65535) * 1664525) + init_key[j] + j;
    this.mt[i] >>>= 0;
    i++;
    j++;
    if (i >= this.N) {
      this.mt[0] = this.mt[this.N - 1];
      i = 1;
    }
    if (j >= key_length) {
      j = 0;
    }
  }
  for (k = this.N - 1; k; k--) {
    s = this.mt[i - 1] ^ this.mt[i - 1] >>> 30;
    this.mt[i] = (this.mt[i] ^ (((s & 4294901760) >>> 16) * 1566083941 << 16) + (s & 65535) * 1566083941) - i;
    this.mt[i] >>>= 0;
    i++;
    if (i >= this.N) {
      this.mt[0] = this.mt[this.N - 1];
      i = 1;
    }
  }
  this.mt[0] = 2147483648;
};
MersenneTwister.prototype.genrand_int32 = function() {
  var y;
  var mag01 = new Array(0, this.MATRIX_A);
  if (this.mti >= this.N) {
    var kk;
    if (this.mti === this.N + 1) {
      this.init_genrand(5489);
    }
    for (kk = 0; kk < this.N - this.M; kk++) {
      y = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
      this.mt[kk] = this.mt[kk + this.M] ^ y >>> 1 ^ mag01[y & 1];
    }
    for (; kk < this.N - 1; kk++) {
      y = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
      this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ y >>> 1 ^ mag01[y & 1];
    }
    y = this.mt[this.N - 1] & this.UPPER_MASK | this.mt[0] & this.LOWER_MASK;
    this.mt[this.N - 1] = this.mt[this.M - 1] ^ y >>> 1 ^ mag01[y & 1];
    this.mti = 0;
  }
  y = this.mt[this.mti++];
  y ^= y >>> 11;
  y ^= y << 7 & 2636928640;
  y ^= y << 15 & 4022730752;
  y ^= y >>> 18;
  return y >>> 0;
};
MersenneTwister.prototype.genrand_int31 = function() {
  return this.genrand_int32() >>> 1;
};
MersenneTwister.prototype.genrand_real1 = function() {
  return this.genrand_int32() * (1 / 4294967295);
};
MersenneTwister.prototype.random = function() {
  return this.genrand_int32() * (1 / 4294967296);
};
MersenneTwister.prototype.genrand_real3 = function() {
  return (this.genrand_int32() + 0.5) * (1 / 4294967296);
};
MersenneTwister.prototype.genrand_res53 = function() {
  var a = this.genrand_int32() >>> 5, b = this.genrand_int32() >>> 6;
  return (a * 67108864 + b) * (1 / 9007199254740992);
};
var mersenne_twister_default = MersenneTwister;

// src/lib/alea.ts
var AleaGen = class {
  c;
  s0;
  s1;
  s2;
  constructor(seed) {
    if (seed == null) seed = +/* @__PURE__ */ new Date();
    let n = 4022871197;
    this.c = 1;
    this.s0 = mash(" ");
    this.s1 = mash(" ");
    this.s2 = mash(" ");
    this.s0 -= mash(seed);
    if (this.s0 < 0) {
      this.s0 += 1;
    }
    this.s1 -= mash(seed);
    if (this.s1 < 0) {
      this.s1 += 1;
    }
    this.s2 -= mash(seed);
    if (this.s2 < 0) {
      this.s2 += 1;
    }
    function mash(data) {
      data = String(data);
      for (let i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        let h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 4294967296;
      }
      return (n >>> 0) * 23283064365386963e-26;
    }
  }
  next() {
    let { c, s0, s1, s2 } = this;
    let t = 2091639 * s0 + c * 23283064365386963e-26;
    this.s0 = s1;
    this.s1 = s2;
    return this.s2 = t - (this.c = t | 0);
  }
  copy(f, t) {
    t.c = f.c;
    t.s0 = f.s0;
    t.s1 = f.s1;
    t.s2 = f.s2;
    return t;
  }
};
var alea_default = AleaGen;

// src/lib/random.ts
function minMax(opts) {
  const { random, min, max } = opts;
  return Math.floor(random * (max - min + 1) + min);
}
function randomNumber(opts) {
  const { value, min, max } = opts;
  const prepareSeed = new alea_default(value);
  const seedOutput = prepareSeed.s1 * 1e7;
  const mersenne = new mersenne_twister_default(seedOutput);
  return minMax({ random: mersenne.random(), min, max });
}

// src/lib/colors.ts
var BACKGROUND_COLORS = [
  "F7F9FC",
  "EEEDFD",
  "FFEBEE",
  "FDEFE2",
  "E7F9F3",
  "EDEEFD",
  "ECFAFE",
  "F2FFD1",
  "FFF7E0",
  "FDF1F7",
  "EAEFE6",
  "E0E6EB",
  "E4E2F3",
  "E6DFEC",
  "E2F4E8",
  "E6EBEF",
  "EBE6EF",
  "E8DEF6",
  "D8E8F3",
  "ECE1FE"
];
var TEXT_COLORS = [
  "060A23",
  "4409B9",
  "BD0F2C",
  "C56511",
  "216E55",
  "05128A",
  "1F84A3",
  "526E0C",
  "935F10",
  "973562",
  "69785E",
  "2D3A46",
  "280F6D",
  "37364F",
  "363548",
  "4D176E",
  "AB133E",
  "420790",
  "222A54",
  "192251"
];
var SHAPE_COLORS = [
  "060A23",
  "5E36F5",
  "E11234",
  "E87917",
  "3EA884",
  "0618BC",
  "0FBBE6",
  "87B80A",
  "FFC933",
  "EE77AF",
  "69785E",
  "2D3A46",
  "280F6D",
  "37364F",
  "363548",
  "4D176E",
  "AB133E",
  "420790",
  "222A54",
  "192251"
];

// src/shape/shapes.tsx
var shapes_exports = {};
__export(shapes_exports, {
  Shape1: () => Shape1,
  Shape10: () => Shape10,
  Shape11: () => Shape11,
  Shape12: () => Shape12,
  Shape13: () => Shape13,
  Shape14: () => Shape14,
  Shape15: () => Shape15,
  Shape16: () => Shape16,
  Shape17: () => Shape17,
  Shape18: () => Shape18,
  Shape19: () => Shape19,
  Shape2: () => Shape2,
  Shape20: () => Shape20,
  Shape21: () => Shape21,
  Shape22: () => Shape22,
  Shape23: () => Shape23,
  Shape24: () => Shape24,
  Shape25: () => Shape25,
  Shape26: () => Shape26,
  Shape27: () => Shape27,
  Shape28: () => Shape28,
  Shape29: () => Shape29,
  Shape3: () => Shape3,
  Shape30: () => Shape30,
  Shape31: () => Shape31,
  Shape32: () => Shape32,
  Shape33: () => Shape33,
  Shape34: () => Shape34,
  Shape35: () => Shape35,
  Shape36: () => Shape36,
  Shape37: () => Shape37,
  Shape38: () => Shape38,
  Shape39: () => Shape39,
  Shape4: () => Shape4,
  Shape40: () => Shape40,
  Shape41: () => Shape41,
  Shape42: () => Shape42,
  Shape43: () => Shape43,
  Shape44: () => Shape44,
  Shape45: () => Shape45,
  Shape46: () => Shape46,
  Shape47: () => Shape47,
  Shape48: () => Shape48,
  Shape49: () => Shape49,
  Shape5: () => Shape5,
  Shape50: () => Shape50,
  Shape51: () => Shape51,
  Shape52: () => Shape52,
  Shape53: () => Shape53,
  Shape54: () => Shape54,
  Shape55: () => Shape55,
  Shape56: () => Shape56,
  Shape57: () => Shape57,
  Shape58: () => Shape58,
  Shape59: () => Shape59,
  Shape6: () => Shape6,
  Shape60: () => Shape60,
  Shape7: () => Shape7,
  Shape8: () => Shape8,
  Shape9: () => Shape9
});
var _tmpl$ = /* @__PURE__ */ template(`<svg><path d="M16 0L32 16L16 32L0 16L16 0ZM16 4L4 16L16 28L28 16L16 4Z"fill=currentColor>`);
var _tmpl$2 = /* @__PURE__ */ template(`<svg><path d="M16 0L32 16L16 32L0 16L16 0ZM16 4L4 16L16 28L28 16L16 4Z"fill=currentColor></path><path d="M16 8L24 16L16 24L8 16L16 8Z"fill=currentColor>`);
var _tmpl$3 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4196)><path d="M14.3891 0.980581C15.0651 -0.32686 16.9349 -0.32686 17.6109 0.980581L21.9157 9.3063C22.0882 9.63994 22.36 9.91178 22.6938 10.0843L31.0194 14.3891C32.3269 15.0651 32.3269 16.9349 31.0194 17.6109L22.6938 21.9157C22.36 22.0882 22.0882 22.36 21.9157 22.6938L17.6109 31.0194C16.9349 32.3269 15.0651 32.3269 14.3891 31.0194L10.0843 22.6938C9.91178 22.36 9.63994 22.0882 9.3063 21.9157L0.980581 17.6109C-0.32686 16.9349 -0.32686 15.0651 0.980581 14.3891L9.3063 10.0843C9.63994 9.91178 9.91178 9.63994 10.0843 9.3063L14.3891 0.980581Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4196><rect fill=white>`);
var _tmpl$4 = /* @__PURE__ */ template(`<svg><path d="M14.9887 0.824754C15.5774 0.344629 16.4226 0.344629 17.0112 0.824754L18.2805 1.85999C18.68 2.18572 19.2118 2.29912 19.7093 2.16464L21.2862 1.73842C22.0186 1.54049 22.7891 1.88399 23.1315 2.56092L23.8766 4.03445C24.1086 4.49301 24.5466 4.81228 25.0541 4.89268L26.6747 5.14943C27.4214 5.26773 27.9835 5.89263 28.0222 6.64772L28.1075 8.31013C28.1338 8.82127 28.403 9.28903 28.8318 9.56852L30.2184 10.4723C30.8498 10.8839 31.1083 11.6805 30.8389 12.3845L30.2424 13.9434C30.0598 14.4203 30.116 14.9557 30.3933 15.3844L31.2989 16.7838C31.708 17.4163 31.6206 18.2485 31.089 18.7822L29.9162 19.9597C29.5555 20.3217 29.3894 20.8342 29.4694 21.339L29.7304 22.9869C29.8483 23.7323 29.4293 24.4589 28.725 24.7302L27.1874 25.3222C26.7088 25.5065 26.3475 25.909 26.2158 26.4046L25.7901 28.0075C25.5957 28.7397 24.9146 29.235 24.1582 29.1945L22.5248 29.1072C22.0107 29.0797 21.5149 29.3011 21.1923 29.7022L20.1622 30.9835C19.6864 31.5753 18.8602 31.7512 18.1845 31.4043L16.7307 30.6579C16.272 30.4226 15.728 30.4226 15.2693 30.6579L13.8154 31.4043C13.1399 31.7512 12.3136 31.5753 11.8378 30.9835L10.8077 29.7022C10.4851 29.3011 9.98927 29.0797 9.47524 29.1072L7.84177 29.1945C7.08544 29.235 6.40433 28.7397 6.2099 28.0075L5.78411 26.4046C5.65246 25.909 5.29123 25.5065 4.81267 25.3222L3.27505 24.7302C2.57065 24.4589 2.15163 23.7323 2.26968 22.9869L2.53059 21.339C2.61051 20.8342 2.44449 20.3217 2.08384 19.9597L0.910984 18.7822C0.379377 18.2485 0.292011 17.4163 0.701193 16.7838L1.60664 15.3844C1.88403 14.9557 1.94011 14.4203 1.75761 13.9434L1.16105 12.3845C0.891637 11.6805 1.15017 10.8839 1.78166 10.4723L3.16822 9.56852C3.59699 9.28903 3.86617 8.82127 3.8924 8.31013L3.97771 6.64772C4.01646 5.89263 4.57848 5.26773 5.32524 5.14943L6.94588 4.89268C7.4534 4.81228 7.89142 4.49301 8.12332 4.03445L8.86852 2.56092C9.21086 1.88399 9.9815 1.54049 10.7138 1.73842L12.2907 2.16464C12.7882 2.29912 13.3201 2.18572 13.7194 1.85999L14.9887 0.824754Z"fill=currentColor>`);
var _tmpl$5 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4202)><path d="M15.6499 0.295421C15.7177 -0.0984755 16.2822 -0.0984728 16.3501 0.295424L17.0981 4.63688C17.1578 4.98301 17.6286 5.04261 17.7723 4.72221L19.5742 0.703522C19.7378 0.338907 20.2845 0.47956 20.2525 0.877992L19.8994 5.26941C19.8712 5.61954 20.3125 5.79459 20.5312 5.52005L23.2741 2.07662C23.5229 1.76421 24.0176 2.03669 23.8877 2.41461L22.4557 6.58008C22.3414 6.91218 22.7254 7.1917 23.0054 6.98027L26.5168 4.32848C26.8354 4.08789 27.2469 4.47506 27.0272 4.80874L24.6062 8.48651C24.4133 8.77973 24.7158 9.14614 25.0395 9.01112L29.0987 7.31758C29.467 7.16394 29.7696 7.64147 29.4739 7.90994L26.2162 10.8689C25.9565 11.1048 26.1586 11.5351 26.5056 11.485L30.8576 10.8561C31.2525 10.7991 31.427 11.337 31.0741 11.5234L27.1842 13.5776C26.8741 13.7414 26.963 14.2085 27.3115 14.2464L31.683 14.7217C32.0797 14.7649 32.115 15.3293 31.727 15.4219L27.4494 16.4424C27.1083 16.5238 27.0786 16.9984 27.4067 17.1219L31.5229 18.6715C31.8963 18.8122 31.7906 19.3677 31.3917 19.3608L26.9952 19.2834C26.6446 19.2771 26.4981 19.7294 26.7853 19.9309L30.3875 22.4574C30.7142 22.6867 30.4739 23.1984 30.0893 23.0922L25.8502 21.9218C25.5122 21.8285 25.2579 22.2299 25.4861 22.4966L28.348 25.8414C28.6077 26.145 28.2478 26.5806 27.9016 26.3819L24.0862 24.192C23.7819 24.0174 23.436 24.343 23.5909 24.6581L25.5326 28.6109C25.7088 28.9696 25.2522 29.3019 24.9662 29.0234L21.8141 25.9515C21.5629 25.7066 21.1469 25.9357 21.2187 26.2795L22.1184 30.5918C22.2 30.9832 21.675 31.1914 21.4674 30.8502L19.1768 27.0894C18.9941 26.7896 18.5344 26.9078 18.5186 27.2587L18.3195 31.66C18.3016 32.0592 17.7414 32.1301 17.625 31.7478L16.3398 27.5346C16.2373 27.1987 15.7627 27.1987 15.6602 27.5346L14.3751 31.7478C14.2585 32.1301 13.6985 32.0592 13.6804 31.66L13.4814 27.2587C13.4656 26.9078 13.0059 26.7896 12.8232 27.0894L10.5327 30.8502C10.3249 31.1914 9.80003 30.9832 9.88166 30.5918L10.7814 26.2795C10.8531 25.9357 10.4372 25.7066 10.1859 25.9515L7.03384 29.0234C6.74786 29.3019 6.29117 28.9696 6.46736 28.6109L8.40918 24.6581C8.564 24.343 8.218 24.0174 7.91381 24.192L4.09835 26.3819C3.75218 26.5806 3.39235 26.145 3.65202 25.8414L6.51397 22.4966C6.74214 22.2299 6.48782 21.8285 6.14984 21.9218L1.91069 23.0922C1.52607 23.1984 1.28572 22.6867 1.61254 22.4574L5.21478 19.9309C5.50198 19.7294 5.35531 19.2771 5.0048 19.2834L0.60831 19.3608C0.209421 19.3677 0.103642 18.8122 0.477101 18.6715L4.59328 17.1219C4.92146 16.9984 4.89165 16.5238 4.55061 16.4424L0.27304 15.4219C-0.115062 15.3293 -0.0796143 14.7649 0.317009 14.7217L4.68851 14.2464C5.03704 14.2085 5.12597 13.7414 4.81584 13.5776L0.925958 11.5234C0.573032 11.337 0.747473 10.7991 1.14234 10.8561L5.49448 11.485C5.84146 11.5351 6.04355 11.1048 5.78381 10.8689L2.52603 7.90994C2.23046 7.64147 2.53293 7.16394 2.90123 7.31758L6.96054 9.01112C7.28419 9.14614 7.58672 8.77973 7.39371 8.48651L4.97274 4.80874C4.75307 4.47506 5.16458 4.08789 5.48317 4.32848L8.99459 6.98027C9.27456 7.1917 9.65853 6.91218 9.54437 6.58008L8.1123 2.41461C7.98238 2.03669 8.47706 1.76421 8.72592 2.07662L11.4688 5.52005C11.6875 5.79459 12.1288 5.61952 12.1007 5.26941L11.7475 0.877989C11.7155 0.479558 12.2622 0.338906 12.4257 0.703518L14.2278 4.72221C14.3714 5.04261 14.8423 4.98301 14.902 4.63688L15.6499 0.295421Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4202><rect fill=white>`);
var _tmpl$6 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4205)><path d="M11.4493 2.61355C13.4938 -0.871185 18.532 -0.871183 20.5765 2.61355L20.6507 2.74011C21.5941 4.34773 23.3134 5.34048 25.1773 5.35354L25.3242 5.35456C29.3643 5.38285 31.8834 9.74597 29.8877 13.259L29.8152 13.3866C28.8946 15.0072 28.8946 16.9928 29.8152 18.6134L29.8877 18.741C31.8834 22.2541 29.3643 26.6171 25.3242 26.6454L25.1773 26.6464C23.3134 26.6595 21.5941 27.6523 20.6507 29.2598L20.5765 29.3864C18.532 32.8712 13.4938 32.8712 11.4493 29.3864L11.375 29.2598C10.4318 27.6523 8.71227 26.6595 6.84843 26.6464L6.7017 26.6454C2.66154 26.6171 0.142494 22.2541 2.13806 18.741L2.21054 18.6134C3.13117 16.9928 3.13117 15.0072 2.21054 13.3866L2.13806 13.259C0.142494 9.74597 2.66154 5.38285 6.7017 5.35456L6.84843 5.35354C8.71229 5.34048 10.4318 4.34773 11.375 2.74011L11.4493 2.61355Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4205><rect fill=white>`);
var _tmpl$7 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M17.1429 0H14.8571V13.2409L5.49442 3.87816L3.87818 5.49442L13.2409 14.8571H0V17.1429H13.2409L3.87818 26.5056L5.49442 28.1218L14.8571 18.759V32H17.1429V18.759L26.5056 28.1218L28.1218 26.5056L18.759 17.1429H32V14.8571H18.759L28.1218 5.4944L26.5056 3.87816L17.1429 13.2409V0Z"fill=currentColor>`);
var _tmpl$8 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M17.1429 0H14.8571V10.1205L11.0659 0.736931L8.94666 1.59318L12.8361 11.2198L5.49442 3.87816L3.87818 5.49442L10.9148 12.5311L1.79586 8.5469L0.880734 10.6414L10.5297 14.8571H0V17.1429H10.5297L0.880738 21.3586L1.79586 23.4531L10.9148 19.469L3.87818 26.5056L5.49442 28.1218L12.8361 20.7802L8.94666 30.4069L11.0659 31.263L14.8571 21.8795V32H17.1429V21.8795L20.9341 31.263L23.0533 30.4069L19.164 20.7802L26.5056 28.1218L28.1218 26.5056L21.0851 19.469L30.2042 23.4531L31.1192 21.3586L21.4704 17.1429H32V14.8571H21.4702L31.1192 10.6414L30.2042 8.5469L21.0851 12.5311L28.1218 5.4944L26.5056 3.87816L19.164 11.2198L23.0533 1.59318L20.9341 0.736931L17.1429 10.1205V0Z"fill=currentColor>`);
var _tmpl$9 = /* @__PURE__ */ template(`<svg><path d="M16.0406 32C15.536 32 15.1094 31.6346 14.9872 31.145C14.5976 29.5845 13.8519 27.925 12.75 26.1667C11.4444 24.0555 9.58333 22.0973 7.16667 20.2917C5.06478 18.703 2.9629 17.6197 0.861021 17.0418C0.363208 16.905 0 16.4635 0 15.9472C0 15.4411 0.349237 15.0047 0.835957 14.8657C2.89672 14.2774 4.88195 13.3221 6.79166 12C8.98611 10.4722 10.8194 8.63888 12.2917 6.5C13.5941 4.59464 14.4881 2.71021 14.9738 0.846731C15.101 0.358552 15.5308 0 16.0354 0C16.5454 0 16.9782 0.366493 17.1024 0.861328C17.3827 1.97846 17.8208 3.12192 18.4166 4.29166C19.1667 5.73611 20.125 7.12499 21.2917 8.45834C22.4861 9.76389 23.8195 10.9444 25.2917 12C27.2155 13.3637 29.1712 14.3218 31.159 14.8742C31.6467 15.0097 32 15.4439 32 15.95C32 16.4637 31.636 16.9014 31.1406 17.0373C29.8806 17.3827 28.5837 17.9398 27.2501 18.7083C25.6389 19.6528 24.1389 20.7778 22.7499 22.0834C21.3611 23.3611 20.2222 24.7083 19.3333 26.125C18.2293 27.8869 17.4827 29.5592 17.0939 31.1422C16.9733 31.6333 16.5461 32 16.0406 32Z"fill=currentColor>`);
var _tmpl$0 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M19.2 0H12.8V8.27451L6.94904 2.42355L2.42355 6.94902L8.27453 12.8H0V19.2H8.27451L2.42355 25.0509L6.94904 29.5765L12.8 23.7254V32H19.2V23.7254L25.051 29.5765L29.5765 25.051L23.7254 19.2H32V12.8H23.7254L29.5765 6.94902L25.051 2.42354L19.2 8.27451V0Z"fill=currentColor>`);
var _tmpl$1 = /* @__PURE__ */ template(`<svg><path d="M16 32C14.6667 32 13.5556 31.5694 12.6667 30.7083C11.7778 29.8472 11.3333 28.8056 11.3333 27.5834C11.3333 26.889 11.4722 26.2638 11.75 25.7083C12.0278 25.1528 12.5139 24.5416 13.2083 23.875C13.9306 23.2083 14.5 22.5834 14.9167 22C15.3611 21.389 15.5833 20.8611 15.5833 20.4166V18.9166C14.9722 18.7778 14.4306 18.5 13.9583 18.0834C13.5139 17.6389 13.2222 17.111 13.0833 16.5H11.5833C11.1111 16.5 10.5556 16.7222 9.91667 17.1667C9.27778 17.611 8.66667 18.1528 8.08333 18.7917C7.5 19.4306 6.91667 19.9027 6.33333 20.2083C5.77778 20.5139 5.1389 20.6667 4.41667 20.6667C3.16667 20.6667 2.1111 20.2222 1.25 19.3333C0.416667 18.4445 0 17.3333 0 16C0 14.6667 0.416667 13.5556 1.25 12.6667C2.1111 11.7778 3.16667 11.3333 4.41667 11.3333C5.58333 11.3333 6.58333 11.75 7.41667 12.5833C8.25 13.4167 9 14.125 9.66667 14.7083C10.3333 15.2917 10.9722 15.5833 11.5833 15.5833H13.0833C13.2222 14.9444 13.5139 14.4167 13.9583 14C14.4306 13.5556 14.9722 13.2778 15.5833 13.1667V11.6667C15.5833 10.9444 15.0278 10.0278 13.9167 8.91667L13.0417 8.04166C11.9028 6.90278 11.3333 5.69445 11.3333 4.41667C11.3333 3.16667 11.7778 2.12499 12.6667 1.29167C13.5833 0.430555 14.6944 0 16 0C17.3333 0 18.4445 0.430555 19.3333 1.29167C20.2222 2.15278 20.6667 3.19445 20.6667 4.41667C20.6667 5.83333 19.9722 7.16667 18.5834 8.41667C17.1944 9.69445 16.5 10.7778 16.5 11.6667V13.1667C17.1389 13.2778 17.6667 13.5556 18.0834 14C18.5278 14.4167 18.8056 14.9444 18.9166 15.5833H20.4166C21.3611 15.5833 22.4445 14.875 23.6667 13.4583C24.9166 12.0417 26.2222 11.3333 27.5834 11.3333C28.8333 11.3333 29.875 11.7917 30.7083 12.7083C31.5694 13.5972 32 14.6944 32 16C32 17.3333 31.5694 18.4445 30.7083 19.3333C29.8472 20.2222 28.8056 20.6667 27.5834 20.6667C26.4166 20.6667 25.4306 20.2638 24.625 19.4584C23.8195 18.6528 23.0694 17.9584 22.375 17.375C21.6805 16.7917 21.0278 16.5 20.4166 16.5H18.9166C18.6944 17.8333 17.889 18.6389 16.5 18.9166V20.4166C16.5 21.2499 17.1944 22.3195 18.5834 23.625C19.9722 24.9306 20.6667 26.2499 20.6667 27.5834C20.6667 28.8333 20.2083 29.875 19.2917 30.7083C18.4027 31.5694 17.3056 32 16 32Z"fill=currentColor>`);
var _tmpl$10 = /* @__PURE__ */ template(`<svg><path d="M16 32C14.9444 32 13.9722 31.7362 13.0833 31.2083C12.2222 30.7083 11.5278 30.0278 11 29.1667C10.5 28.2778 10.25 27.3056 10.25 26.2499C10.25 24.9166 10.5556 23.8056 11.1667 22.9166C11.7778 22.0278 12.7222 20.9861 14 19.7917C14.9444 18.9306 15.4167 18.111 15.4167 17.3333V16.5834H14.6667C13.8056 16.5834 12.625 17.4445 11.125 19.1667C9.65278 20.889 7.8611 21.7499 5.75 21.7499C4.69445 21.7499 3.72222 21.5 2.83333 21C1.97222 20.4722 1.27778 19.7778 0.75 18.9166C0.25 18.0278 0 17.0555 0 16C0 14.9444 0.25 13.9861 0.75 13.125C1.27778 12.2361 1.97222 11.5417 2.83333 11.0417C3.72222 10.5139 4.69445 10.25 5.75 10.25C7.83333 10.25 9.6111 11.0972 11.0833 12.7917C12.5556 14.4861 13.75 15.3333 14.6667 15.3333H15.4167V14.6667C15.4167 13.8889 14.9444 13.0694 14 12.2083L13.0417 11.3333C12.3472 10.6944 11.7083 9.93056 11.125 9.04166C10.5417 8.12499 10.25 7.02778 10.25 5.75C10.25 4.69445 10.5 3.73611 11 2.87501C11.5278 1.98611 12.2222 1.29167 13.0833 0.791666C13.9722 0.263888 14.9444 0 16 0C17.0555 0 18.0139 0.263888 18.875 0.791666C19.7638 1.31944 20.4584 2.01389 20.9584 2.87501C21.4861 3.73611 21.7499 4.69445 21.7499 5.75C21.7499 7.83333 20.9027 9.6111 19.2083 11.0833C17.5139 12.5556 16.6667 13.75 16.6667 14.6667V15.3333H17.3333C18.2778 15.3333 19.4722 14.4861 20.9166 12.7917C22.3333 11.0972 24.111 10.25 26.2501 10.25C27.3056 10.25 28.2638 10.5139 29.125 11.0417C30.0139 11.5417 30.7083 12.2222 31.2083 13.0833C31.7362 13.9444 32 14.9167 32 16C32 17.0555 31.7362 18.0278 31.2083 18.9166C30.7083 19.7778 30.0139 20.4722 29.125 21C28.2638 21.5 27.3056 21.7499 26.2501 21.7499C24.9445 21.7499 23.8195 21.4306 22.875 20.7917C21.9584 20.1528 20.9306 19.2222 19.7917 18C18.9306 17.0555 18.111 16.5834 17.3333 16.5834H16.6667V17.3333C16.6667 18.3611 17.5139 19.5555 19.2083 20.9166C20.9027 22.2778 21.7499 24.0555 21.7499 26.2499C21.7499 27.3056 21.4861 28.2778 20.9584 29.1667C20.4584 30.0278 19.7778 30.7083 18.9166 31.2083C18.0555 31.7362 17.0834 32 16 32Z"fill=currentColor>`);
var _tmpl$11 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M19.2 2.28571C19.2 1.02335 18.1766 0 16.9142 0H15.0857C13.8233 0 12.8 1.02335 12.8 2.28571V2.7563C12.8 4.79266 10.338 5.81246 8.89805 4.37254L8.56528 4.03979C7.67266 3.14717 6.22542 3.14717 5.33278 4.03979L4.03979 5.33278C3.14717 6.22541 3.14717 7.67264 4.03979 8.56528L4.37256 8.89805C5.81248 10.338 4.79267 12.8 2.75632 12.8H2.28571C1.02335 12.8 0 13.8233 0 15.0857V16.9142C0 18.1766 1.02335 19.2 2.28571 19.2H2.7563C4.79267 19.2 5.81248 21.6621 4.37256 23.1019L4.03979 23.4347C3.14717 24.3274 3.14717 25.7746 4.03979 26.6672L5.33278 27.9602C6.22542 28.8528 7.67266 28.8528 8.56528 27.9602L8.89805 27.6274C10.338 26.1875 12.8 27.2074 12.8 29.2437V29.7142C12.8 30.9766 13.8233 32 15.0857 32H16.9142C18.1766 32 19.2 30.9766 19.2 29.7142V29.2437C19.2 27.2074 21.6621 26.1875 23.1019 27.6274L23.4347 27.9602C24.3274 28.8528 25.7746 28.8528 26.6672 27.9602L27.9602 26.6672C28.8528 25.7746 28.8528 24.3274 27.9602 23.4347L27.6275 23.1019C26.1875 21.6621 27.2074 19.2 29.2437 19.2H29.7142C30.9766 19.2 32 18.1766 32 16.9142V15.0857C32 13.8233 30.9766 12.8 29.7142 12.8H29.2437C27.2074 12.8 26.1875 10.338 27.6274 8.89805L27.9602 8.56526C28.8528 7.67264 28.8528 6.22541 27.9602 5.33278L26.6672 4.03979C25.7746 3.14715 24.3274 3.14715 23.4347 4.03979L23.1019 4.37254C21.6621 5.81246 19.2 4.79266 19.2 2.7563V2.28571Z"fill=currentColor>`);
var _tmpl$12 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M17.6 0C18.4837 0 19.2 0.716344 19.2 1.6V4.41178C19.2 5.83722 20.9234 6.55109 21.9314 5.54314L23.9195 3.55491C24.5445 2.93008 25.5574 2.93008 26.1824 3.55491L28.4451 5.81766C29.0699 6.4425 29.0699 7.45557 28.4451 8.0804L26.4568 10.0686C25.449 11.0766 26.1627 12.8 27.5882 12.8H30.4C31.2837 12.8 32 13.5163 32 14.4V17.6C32 18.4837 31.2837 19.2 30.4 19.2H27.5882C26.1627 19.2 25.449 20.9234 26.4568 21.9314L28.4451 23.9195C29.0699 24.5445 29.0699 25.5574 28.4451 26.1824L26.1824 28.4451C25.5574 29.0699 24.5445 29.0699 23.9195 28.4451L21.9314 26.4568C20.9234 25.449 19.2 26.1627 19.2 27.5882V30.4C19.2 31.2837 18.4837 32 17.6 32H14.4C13.5163 32 12.8 31.2837 12.8 30.4V27.5882C12.8 26.1627 11.0766 25.449 10.0686 26.4568L8.0804 28.4451C7.45557 29.0699 6.4425 29.0699 5.81766 28.4451L3.55493 26.1824C2.93008 25.5574 2.93008 24.5445 3.55493 23.9195L5.54315 21.9314C6.55109 20.9234 5.83723 19.2 4.41178 19.2H1.6C0.716346 19.2 0 18.4837 0 17.6V14.4C0 13.5163 0.716344 12.8 1.6 12.8H4.41178C5.83722 12.8 6.55109 11.0766 5.54315 10.0686L3.55493 8.0804C2.93008 7.45555 2.93008 6.4425 3.55493 5.81766L5.81766 3.55491C6.4425 2.93008 7.45557 2.93008 8.0804 3.55491L10.0686 5.54314C11.0766 6.55109 12.8 5.83722 12.8 4.41178V1.6C12.8 0.716344 13.5163 0 14.4 0H17.6ZM16 24C20.4182 24 24 20.4182 24 16C24 11.5817 20.4182 8 16 8C11.5817 8 8 11.5817 8 16C8 20.4182 11.5817 24 16 24Z"fill=currentColor>`);
var _tmpl$13 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4226)><path fill-rule=evenodd clip-rule=evenodd d="M16.2566 0.137553C16.1323 -0.0696549 15.832 -0.0696548 15.7077 0.137554L12.6898 5.16932C12.6076 5.3063 12.4371 5.3617 12.2901 5.29919L6.89094 3.00231C6.66861 2.90772 6.42566 3.08423 6.44691 3.3249L6.96294 9.16959C6.97699 9.3287 6.87158 9.47378 6.71592 9.50959L0.997836 10.8249C0.762365 10.8791 0.66957 11.1647 0.828233 11.3469L4.68114 15.772C4.78602 15.8925 4.78602 16.0718 4.68114 16.1923L0.828233 20.6174C0.66957 20.7997 0.762366 21.0853 0.997837 21.1394L6.71592 22.4547C6.87158 22.4906 6.97699 22.6357 6.96294 22.7947L6.44691 28.6394C6.42566 28.8802 6.66861 29.0566 6.89094 28.9621L12.2901 26.6651C12.4371 26.6026 12.6076 26.6581 12.6898 26.795L15.7077 31.8267C15.832 32.0341 16.1323 32.0339 16.2566 31.8267L19.2746 26.795C19.3566 26.6581 19.5272 26.6026 19.6742 26.6651L25.0734 28.9621C25.2957 29.0566 25.5387 28.8802 25.5174 28.6394L25.0014 22.7947C24.9874 22.6357 25.0928 22.4906 25.2485 22.4547L30.9666 21.1394C31.2019 21.0853 31.2947 20.7997 31.1362 20.6174L27.2832 16.1923C27.1784 16.0718 27.1784 15.8925 27.2832 15.772L31.1362 11.3469C31.2947 11.1647 31.2019 10.8791 30.9666 10.8249L25.2485 9.50959C25.0928 9.47378 24.9874 9.3287 25.0014 9.16959L25.5174 3.3249C25.5387 3.08423 25.2957 2.90772 25.0734 3.00231L19.6742 5.29919C19.5272 5.3617 19.3566 5.3063 19.2746 5.16932L16.2566 0.137553ZM16 24C20.4182 24 24 20.4182 24 16C24 11.5817 20.4182 8.00001 16 8.00001C11.5817 8.00001 8 11.5817 8 16C8 20.4182 11.5817 24 16 24Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4226><rect fill=white>`);
var _tmpl$14 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M16.5029 0C16.8563 0 17.1429 0.286538 17.1429 0.64V6.82798C17.1429 7.53142 18.1128 7.71995 18.3763 7.06773L20.6942 1.33033C20.8267 1.0026 21.1997 0.84427 21.5275 0.97668L22.46 1.35343C22.7877 1.48584 22.9461 1.85885 22.8136 2.18658L20.3424 8.30317C20.0811 8.9496 20.8952 9.48846 21.3883 8.99547L26.053 4.3307C26.303 4.08077 26.7082 4.08077 26.9581 4.3307L27.6693 5.04186C27.9192 5.29179 27.9192 5.69701 27.6693 5.94694L23.4803 10.1359C22.9803 10.636 23.5411 11.458 24.1891 11.1749L29.6176 8.80314C29.9416 8.66162 30.3189 8.80947 30.4603 9.13336L30.863 10.055C31.0045 10.3789 30.8566 10.7561 30.5328 10.8977L24.2774 13.6307C23.6419 13.9083 23.8402 14.8571 24.5336 14.8571H31.36C31.7134 14.8571 32 15.1437 32 15.4971V16.5029C32 16.8563 31.7134 17.1429 31.36 17.1429H24.5338C23.8402 17.1429 23.6421 18.0917 24.2774 18.3693L30.5328 21.1024C30.8566 21.2438 31.0045 21.6211 30.863 21.945L30.4603 22.8666C30.3189 23.1906 29.9416 23.3384 29.6176 23.1968L24.1891 20.8251C23.5411 20.5419 22.9803 21.364 23.4803 21.8642L27.6693 26.053C27.9192 26.303 27.9192 26.7082 27.6693 26.9581L26.9581 27.6693C26.7082 27.9192 26.303 27.9192 26.053 27.6693L21.3883 23.0045C20.8952 22.5115 20.0811 23.0504 20.3424 23.6968L22.8136 29.8134C22.9461 30.1411 22.7877 30.5141 22.46 30.6466L21.5275 31.0234C21.1997 31.1557 20.8267 30.9974 20.6942 30.6696L18.3763 24.9323C18.1128 24.28 17.1429 24.4686 17.1429 25.172V31.36C17.1429 31.7134 16.8563 32 16.5029 32H15.4971C15.1437 32 14.8571 31.7134 14.8571 31.36V25.172C14.8571 24.4686 13.8872 24.28 13.6237 24.9323L11.3057 30.6696C11.1733 30.9974 10.8003 31.1557 10.4725 31.0234L9.54005 30.6466C9.21232 30.5141 9.054 30.1411 9.1864 29.8134L11.6577 23.6968C11.9189 23.0504 11.1047 22.5115 10.6117 23.0045L5.94696 27.6693C5.69702 27.9192 5.29179 27.9192 5.04187 27.6693L4.33072 26.9581C4.08078 26.7082 4.08078 26.303 4.33072 26.053L8.51966 21.864C9.01973 21.364 8.45893 20.5419 7.81088 20.8251L2.38232 23.1968C2.05843 23.3384 1.68114 23.1906 1.53962 22.8666L1.13697 21.945C0.995458 21.6211 1.14331 21.2438 1.46721 21.1024L7.72251 18.3693C8.35798 18.0917 8.15976 17.1429 7.46627 17.1429H0.64C0.286538 17.1429 0 16.8563 0 16.5029V15.4971C0 15.1437 0.286538 14.8571 0.64 14.8571H7.4663C8.15978 14.8571 8.35802 13.9083 7.72254 13.6307L1.4672 10.8977C1.1433 10.7561 0.995453 10.3789 1.13697 10.055L1.53962 9.13336C1.68114 8.80947 2.05842 8.66162 2.38232 8.80314L7.81088 11.1749C8.45893 11.4581 9.01973 10.636 8.51966 10.1359L4.33072 5.94696C4.08078 5.69702 4.08078 5.29179 4.33072 5.04186L5.04186 4.33072C5.29179 4.08078 5.69702 4.08078 5.94696 4.33072L10.6117 8.99549C11.1047 9.48848 11.9188 8.94962 11.6577 8.30318L9.1864 2.18658C9.054 1.85885 9.21234 1.48584 9.54005 1.35343L10.4725 0.97668C10.8003 0.84427 11.1733 1.0026 11.3057 1.33033L13.6237 7.06773C13.8872 7.71995 14.8571 7.53142 14.8571 6.82798V0.64C14.8571 0.286538 15.1437 0 15.4971 0H16.5029ZM16 22.8571C19.787 22.8571 22.8571 19.787 22.8571 16C22.8571 12.2129 19.787 9.14286 16 9.14286C12.2129 9.14286 9.14286 12.2129 9.14286 16C9.14286 19.787 12.2129 22.8571 16 22.8571Z"fill=currentColor>`);
var _tmpl$15 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M17.1429 0.64C17.1429 0.286538 16.8563 0 16.5029 0H15.4971C15.1437 0 14.8571 0.286538 14.8571 0.64V6.82798C14.8571 7.53142 13.8872 7.71995 13.6237 7.06773L11.3057 1.33033C11.1733 1.0026 10.8003 0.84427 10.4725 0.97668L9.54005 1.35343C9.21234 1.48584 9.054 1.85885 9.1864 2.18658L11.6577 8.30318C11.9188 8.94962 11.1047 9.48848 10.6117 8.99549L5.94696 4.33072C5.69702 4.08078 5.29179 4.08078 5.04186 4.33072L4.33072 5.04186C4.08078 5.29179 4.08078 5.69702 4.33072 5.94696L8.51966 10.1359C9.01973 10.636 8.45893 11.4581 7.81088 11.1749L2.38232 8.80314C2.05842 8.66162 1.68114 8.80947 1.53962 9.13336L1.13697 10.055C0.995453 10.3789 1.1433 10.7561 1.4672 10.8977L7.72254 13.6307C8.35802 13.9083 8.15978 14.8571 7.4663 14.8571H0.64C0.286538 14.8571 0 15.1437 0 15.4971V16.5029C0 16.8563 0.286538 17.1429 0.64 17.1429H7.46627C8.15976 17.1429 8.35798 18.0917 7.72251 18.3693L1.46721 21.1024C1.14331 21.2438 0.995461 21.6211 1.13697 21.945L1.53963 22.8666C1.68114 23.1906 2.05843 23.3384 2.38232 23.1968L7.81088 20.8251C8.45893 20.5419 9.01973 21.364 8.51966 21.8642L4.33072 26.053C4.08078 26.303 4.08078 26.7082 4.33072 26.9581L5.04187 27.6693C5.29179 27.9192 5.69702 27.9192 5.94696 27.6693L10.6117 23.0045C11.1047 22.5115 11.9189 23.0504 11.6577 23.6968L9.1864 29.8134C9.054 30.1411 9.21232 30.5141 9.54005 30.6466L10.4725 31.0234C10.8003 31.1557 11.1733 30.9974 11.3057 30.6696L13.6237 24.9323C13.8872 24.28 14.8571 24.4686 14.8571 25.172V31.36C14.8571 31.7134 15.1437 32 15.4971 32H16.5029C16.8563 32 17.1429 31.7134 17.1429 31.36V25.172C17.1429 24.4686 18.1128 24.28 18.3763 24.9323L20.6942 30.6696C20.8267 30.9974 21.1997 31.1557 21.5275 31.0234L22.46 30.6466C22.7877 30.5141 22.9461 30.1411 22.8136 29.8134L20.3424 23.6968C20.0811 23.0504 20.8952 22.5115 21.3883 23.0045L26.053 27.6693C26.303 27.9192 26.7082 27.9192 26.9581 27.6693L27.6693 26.9581C27.9192 26.7082 27.9192 26.303 27.6693 26.053L23.4803 21.8642C22.9803 21.364 23.5411 20.5419 24.1891 20.8251L29.6176 23.1968C29.9416 23.3384 30.3189 23.1906 30.4603 22.8666L30.863 21.945C31.0045 21.6211 30.8566 21.2438 30.5328 21.1024L24.2774 18.3693C23.6421 18.0917 23.8402 17.1429 24.5338 17.1429H31.36C31.7134 17.1429 32 16.8563 32 16.5029V15.4971C32 15.1437 31.7134 14.8571 31.36 14.8571H24.5338C23.8402 14.8571 23.6419 13.9083 24.2774 13.6307L30.5328 10.8977C30.8566 10.7561 31.0045 10.3789 30.863 10.055L30.4603 9.13336C30.3189 8.80947 29.9416 8.66162 29.6176 8.80314L24.1891 11.1749C23.5411 11.458 22.9803 10.636 23.4803 10.1359L27.6693 5.94694C27.9192 5.69701 27.9192 5.29179 27.6693 5.04186L26.9581 4.3307C26.7082 4.08077 26.303 4.08077 26.053 4.3307L21.3883 8.99547C20.8952 9.48846 20.0811 8.9496 20.3424 8.30317L22.8136 2.18658C22.9461 1.85885 22.7877 1.48584 22.46 1.35343L21.5275 0.97668C21.1997 0.84427 20.8267 1.0026 20.6942 1.33033L18.3763 7.06773C18.1128 7.71995 17.1429 7.53142 17.1429 6.82798V0.64Z"fill=currentColor>`);
var _tmpl$16 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M16 32C24.8365 32 32 24.8365 32 16C32 7.16344 24.8365 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8365 7.16344 32 16 32ZM16 23C19.8659 23 23 19.8659 23 16C23 12.134 19.8659 9 16 9C12.134 9 9 12.134 9 16C9 19.8659 12.134 23 16 23Z"fill=currentColor>`);
var _tmpl$17 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M8 16C12.4183 16 16 12.4183 16 8C16 12.4183 19.5818 16 24 16C19.5818 16 16 19.5818 16 24C16 19.5818 12.4183 16 8 16ZM8 16C3.58173 16 0 19.5818 0 24C0 28.4182 3.58173 32 8 32C12.4183 32 16 28.4182 16 24C16 28.4182 19.5818 32 24 32C28.4182 32 32 28.4182 32 24C32 19.5818 28.4182 16 24 16C28.4182 16 32 12.4183 32 8C32 3.58173 28.4182 0 24 0C19.5818 0 16 3.58173 16 8C16 3.58173 12.4183 0 8 0C3.58173 0 0 3.58173 0 8C0 12.4183 3.58173 16 8 16Z"fill=currentColor>`);
var _tmpl$18 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M18.608 12.0758L23.8965 6.78739C24.26 6.42397 24.8491 6.42397 25.2126 6.78739C25.576 7.15083 25.576 7.74006 25.2126 8.10349L19.9242 13.3919C21.1178 13.1237 22.5114 12.9697 24 12.9697C28.4182 12.9697 32 14.3264 32 16C32 17.6736 28.4182 19.0302 24 19.0302C22.5114 19.0302 21.1178 18.8763 19.9242 18.608L25.2126 23.8965C25.576 24.26 25.576 24.8491 25.2126 25.2126C24.8491 25.576 24.26 25.576 23.8965 25.2126L18.608 19.9242C18.8763 21.1178 19.0302 22.5115 19.0302 24C19.0302 28.4182 17.6736 32 16 32C14.3264 32 12.9697 28.4182 12.9697 24C12.9697 22.5114 13.1237 21.1178 13.3919 19.9242L8.10349 25.2126C7.74006 25.576 7.15083 25.576 6.78741 25.2126C6.42398 24.8491 6.42398 24.26 6.78741 23.8965L12.0758 18.608C10.8822 18.8763 9.48856 19.0302 8 19.0302C3.58173 19.0302 0 17.6736 0 16C0 14.3264 3.58173 12.9697 8 12.9697C9.48856 12.9697 10.8822 13.1237 12.0758 13.3919L6.78741 8.1035C6.42398 7.74008 6.42398 7.15085 6.78741 6.78741C7.15083 6.42398 7.74006 6.42398 8.10349 6.78741L13.3919 12.0759C13.1237 10.8822 12.9697 9.48858 12.9697 8C12.9697 3.58173 14.3264 0 16 0C17.6736 0 19.0302 3.58173 19.0302 8C19.0302 9.48856 18.8763 10.8822 18.608 12.0758Z"fill=currentColor>`);
var _tmpl$19 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M16 16C16 16 18 10.6442 18 6.85714C18 3.07005 17.1046 0 16 0C14.8954 0 14 3.07005 14 6.85714C14 10.6442 16 16 16 16ZM16 16C16 16 18.373 21.2013 21.0507 23.8792C23.7286 26.5571 26.5326 28.0947 27.3138 27.3138C28.0947 26.5326 26.5571 23.7286 23.8792 21.0507C21.2013 18.373 16 16 16 16ZM16 16C16 16 21.3558 14 25.1429 14C28.9299 14 32 14.8954 32 16C32 17.1046 28.9299 18 25.1429 18C21.3558 18 16 16 16 16ZM16 16C16 16 10.7987 18.373 8.1208 21.0507C5.44293 23.7286 3.90523 26.5326 4.68629 27.3138C5.46734 28.0947 8.27136 26.5571 10.9492 23.8792C13.6271 21.2013 16 16 16 16ZM16 16C16.0045 16.0118 18 21.36 18 25.1429C18 28.9299 17.1046 32 16 32C14.8954 32 14 28.9299 14 25.1429C14 21.3558 16 16 16 16ZM16 16C16 16 10.6442 14 6.85714 14C3.07005 14 0 14.8954 0 16C0 17.1046 3.07005 18 6.85714 18C10.6442 18 16 16 16 16ZM16 16C16 16 21.2013 13.6271 23.8792 10.9492C26.5571 8.27134 28.0947 5.46733 27.3138 4.68629C26.5326 3.90523 23.7286 5.44293 21.0507 8.1208C18.373 10.7987 16 16 16 16ZM10.9492 8.1208C13.6271 10.7987 16 16 16 16C16 16 10.7987 13.6271 8.12082 10.9492C5.44293 8.27136 3.90525 5.46734 4.68629 4.68629C5.46734 3.90525 8.27136 5.44293 10.9492 8.1208Z"fill=currentColor>`);
var _tmpl$20 = /* @__PURE__ */ template(`<svg><path d="M16 2L21.12 17.68L32 30L16 26.64L0 30L10.88 17.68L16 2Z"fill=currentColor>`);
var _tmpl$21 = /* @__PURE__ */ template(`<svg><path d="M16 0L20.5255 11.4745L32 16L20.5255 20.5255L16 32L11.4745 20.5255L0 16L11.4745 11.4745L16 0Z"fill=currentColor>`);
var _tmpl$22 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M0 25.3448C7.38514 23.0107 8.98979 24.6152 6.6556 32C10.9685 24.6152 21.0315 24.6152 25.3445 32C23.0118 24.6152 24.6166 23.0107 32 25.3448C24.6166 21.032 24.6166 10.9696 32 6.65694C24.6166 8.98931 23.0118 7.38475 25.3445 0C21.0315 7.38475 10.9685 7.38475 6.6556 0C8.98979 7.38475 7.38514 8.98931 0 6.65694C7.38514 10.9696 7.38514 21.032 0 25.3448ZM16 21.92C19.2696 21.92 21.92 19.2696 21.92 16C21.92 12.7305 19.2696 10.08 16 10.08C12.7305 10.08 10.08 12.7305 10.08 16C10.08 19.2696 12.7305 21.92 16 21.92Z"fill=currentColor>`);
var _tmpl$23 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M21.7142 0H10.2857V10.2857H4.99558e-07L0 21.7142H10.2857V32H21.7142V21.7142H32V10.2857H21.7142V0Z"fill=currentColor>`);
var _tmpl$24 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4264)><path fill-rule=evenodd clip-rule=evenodd d="M17.1157 14.016C16.6264 14.8862 15.3736 14.8862 14.8843 14.016L8.07496 1.90741C7.59512 1.05416 8.21173 1.27616e-06 9.19064 9.07706e-07L22.8093 0C23.7883 -8.55795e-08 24.4048 1.05416 23.9249 1.90741L17.1157 14.016ZM14.016 17.1157C14.8861 16.6264 14.8861 15.3736 14.016 14.8843L1.9074 8.07496C1.05414 7.59514 -1.46207e-05 8.21173 -1.46635e-05 9.19064L-1.52588e-05 22.8093C-1.53016e-05 23.7883 1.05415 24.4048 1.9074 23.925L14.016 17.1157ZM17.1157 17.984C16.6264 17.1138 15.3736 17.1139 14.8843 17.984L8.07496 30.0926C7.59514 30.9459 8.21173 32 9.19064 32H22.8093C23.7883 32 24.4048 30.9458 23.9249 30.0926L17.1157 17.984ZM17.984 14.8843C17.1137 15.3736 17.1137 16.6264 17.984 17.1157L30.0926 23.925C30.9459 24.4048 32 23.7883 32 22.8093V9.19067C32 8.21176 30.9457 7.59515 30.0926 8.07499L17.984 14.8843Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4264><rect fill=white>`);
var _tmpl$25 = /* @__PURE__ */ template(`<svg><path d="M24.9702 23.0298L17.9403 16L24.9702 8.97018L32 16L24.9702 23.0298ZM7.02982 23.0298L0 16L7.02982 8.97018L14.0596 16L7.02982 23.0298ZM16 32L8.97018 24.9702L16 17.9403L23.0298 24.9702L16 32ZM16 14.0596L8.97018 7.02982L16 0L23.0298 7.02982L16 14.0596Z"fill=currentColor>`);
var _tmpl$26 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M19.9838 0.786741L16.928 13.7597L23.9403 2.4256C24.1576 2.07458 24.6453 2.0179 24.9371 2.30978L29.6902 7.06283C29.9821 7.3547 29.9254 7.84245 29.5744 8.05963L18.2403 15.0721L31.2133 12.0162C31.615 11.9215 32 12.2264 32 12.6391V19.361C32 19.7738 31.615 20.0786 31.2133 19.9838L18.2403 16.928L29.5744 23.9405C29.9254 24.1576 29.9821 24.6453 29.6902 24.9373L24.9371 29.6902C24.6453 29.9821 24.1576 29.9254 23.9403 29.5744L16.928 18.2403L19.9838 31.2133C20.0786 31.615 19.7736 32 19.361 32H12.6391C12.2263 32 11.9215 31.615 12.0161 31.2133L15.072 18.2403L8.05962 29.5744C7.84245 29.9254 7.35469 29.9821 7.06282 29.6902L2.30978 24.9371C2.0179 24.6453 2.07458 24.1576 2.4256 23.9403L13.7596 16.928L0.786742 19.9838C0.38497 20.0786 0 19.7738 0 19.361V12.6391C3.11862e-07 12.2263 0.384968 11.9215 0.786742 12.0162L13.7597 15.072L2.4256 8.05965C2.07458 7.84246 2.0179 7.3547 2.30978 7.06283L7.06282 2.30979C7.35469 2.01792 7.84245 2.07459 8.05962 2.42562L15.072 13.7597L12.0161 0.786742C11.9215 0.38497 12.2263 6.23725e-07 12.6391 5.8764e-07L19.361 0C19.7738 0 20.0786 0.384968 19.9838 0.786741ZM16 17.8286C17.0099 17.8286 17.8286 17.0099 17.8286 16C17.8286 14.9901 17.0099 14.1714 16 14.1714C14.9901 14.1714 14.1714 14.9901 14.1714 16C14.1714 17.0099 14.9901 17.8286 16 17.8286Z"fill=currentColor>`);
var _tmpl$27 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4288)><path fill-rule=evenodd clip-rule=evenodd d="M9.38528 23.6458C9.17515 23.1915 8.80909 22.8254 8.35477 22.6152C4.81869 20.9797 2.02138 18.6211 0.528224 17.2067C-0.176077 16.5395 -0.176073 15.461 0.528226 14.7938C2.02138 13.3794 4.81869 11.0208 8.35475 9.3853C8.80909 9.17515 9.17515 8.80909 9.38528 8.35477C11.0208 4.8187 13.3794 2.02138 14.7938 0.528224C15.461 -0.176076 16.5395 -0.176074 17.2067 0.528225C18.6211 2.02138 20.9797 4.8187 22.6152 8.35477C22.8254 8.80909 23.1915 9.17515 23.6458 9.38528C27.1819 11.0208 29.9792 13.3794 31.4723 14.7938C32.1766 15.461 32.1766 16.5395 31.4723 17.2067C29.9792 18.6211 27.1819 20.9797 23.6458 22.6152C23.1915 22.8254 22.8254 23.1915 22.6152 23.6458C20.9797 27.1819 18.6211 29.9792 17.2067 31.4723C16.5395 32.1766 15.461 32.1766 14.7938 31.4723C13.3794 29.9792 11.0208 27.1819 9.38528 23.6458ZM16.0003 21.8818C19.2485 21.8818 21.8818 19.2485 21.8818 16.0003C21.8818 12.752 19.2485 10.1188 16.0003 10.1188C12.752 10.1188 10.1188 12.752 10.1188 16.0003C10.1188 19.2485 12.752 21.8818 16.0003 21.8818Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4288><rect fill=white>`);
var _tmpl$28 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M32 16.1074L16 0L0 16.1074H15.7867L0 32H32L16.2133 16.1074H32Z"fill=currentColor>`);
var _tmpl$29 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M16 3.97741L10.6667 0V10.6666H0L3.97741 16L4.66254e-07 21.3333H10.6667V10.6667H21.3333V0L16 3.97741ZM28.0226 16L32 10.6667H21.3333V21.3333H10.6667V32L16 28.0226L21.3333 32V21.3333H32L28.0226 16Z"fill=currentColor>`);
var _tmpl$30 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4302)><path fill-rule=evenodd clip-rule=evenodd d="M2.94474 16.0675C1.33084 16.388 0.114281 17.812 0.114281 19.52L0.114281 28.48C0.114281 30.424 1.69024 32 3.63429 32H12.5943C14.3424 32 15.7929 30.7256 16.0675 29.0552C16.388 30.6691 17.812 31.8858 19.52 31.8858H28.48C30.424 31.8858 32 30.3098 32 28.3658V19.4058C32 17.6576 30.7256 16.207 29.0554 15.9325C30.6691 15.6119 31.8858 14.188 31.8858 12.48V3.52C31.8858 1.57596 30.3098 4.7663e-07 28.3658 3.91654e-07L19.4058 0C17.6576 -7.64136e-08 16.207 1.27434 15.9325 2.94474C15.612 1.33084 14.188 0.114285 12.48 0.114285H3.52C1.57596 0.114285 0 1.69024 0 3.63429V12.5943C0 14.3424 1.27434 15.7929 2.94474 16.0675Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4302><rect fill=white>`);
var _tmpl$31 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4313)><path fill-rule=evenodd clip-rule=evenodd d="M4.68629 4.68629C3.08253 6.29005 2.50333 8.5304 2.9487 10.594C1.17461 11.7382 0 13.7319 0 16C-2.7865e-07 18.268 1.17461 20.2618 2.9487 21.4061C2.50333 23.4696 3.08253 25.7099 4.68629 27.3138C6.29006 28.9174 8.5304 29.4966 10.594 29.0514C11.7382 30.8254 13.7319 32 16 32C18.268 32 20.2618 30.8254 21.4061 29.0514C23.4696 29.4966 25.7099 28.9174 27.3138 27.3138C28.9174 25.7099 29.4966 23.4696 29.0514 21.4061C30.8254 20.2618 32 18.268 32 16C32 13.7319 30.8254 11.7382 29.0514 10.594C29.4966 8.5304 28.9174 6.29006 27.3138 4.68629C25.7099 3.08253 23.4696 2.50333 21.4061 2.9487C20.2618 1.17461 18.268 0 16 0C13.7319 0 11.7382 1.17461 10.594 2.94869C8.5304 2.50333 6.29006 3.08253 4.68629 4.68629Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4313><rect fill=white>`);
var _tmpl$32 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M2.9487 10.594C2.50333 8.5304 3.08253 6.29005 4.68629 4.68629C6.29006 3.08253 8.5304 2.50333 10.594 2.94869C11.7382 1.17461 13.7319 0 16 0C18.268 0 20.2618 1.17461 21.4061 2.9487C23.4696 2.50333 25.7099 3.08253 27.3138 4.68629C28.9174 6.29006 29.4966 8.5304 29.0514 10.594C30.8254 11.7382 32 13.7319 32 16C32 18.268 30.8254 20.2618 29.0514 21.4061C29.4966 23.4696 28.9174 25.7099 27.3138 27.3138C25.7099 28.9174 23.4696 29.4966 21.4061 29.0514C20.2618 30.8254 18.268 32 16 32C13.7319 32 11.7382 30.8254 10.594 29.0514C8.5304 29.4966 6.29006 28.9174 4.68629 27.3138C3.08253 25.7099 2.50333 23.4696 2.9487 21.4061C1.17461 20.2618 0 18.268 0 16C0 13.7319 1.17461 11.7382 2.9487 10.594ZM11.4329 20.5592C13.9433 23.0694 18.0134 23.0694 20.5238 20.5592C23.0342 18.0488 23.0342 13.9786 20.5238 11.4682C18.0134 8.95781 13.9433 8.95781 11.4329 11.4682C8.9225 13.9786 8.9225 18.0488 11.4329 20.5592Z"fill=currentColor>`);
var _tmpl$33 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4318)><path d="M20.3573 17.6493C23.337 18.7773 27.3477 18.5717 29.9013 17.16L32 16L29.9013 14.84C27.3477 13.4284 23.3371 13.2228 20.3573 14.3507L18.1227 15.1965C18.1088 15.1515 18.092 15.108 18.0755 15.0643L20.2474 14.0851C23.152 12.7757 25.8424 9.79438 26.6501 6.99051L27.3138 4.68621L25.0094 5.34987C22.2056 6.15747 19.2243 8.848 17.9147 11.7526L16.9691 13.8503C16.9254 13.8291 16.8818 13.808 16.8366 13.7896L17.6493 11.6426C18.7771 8.66293 18.5715 4.65227 17.16 2.09861L16 0L14.84 2.09867C13.4284 4.65235 13.2228 8.66293 14.3507 11.6427L15.1633 13.7897C15.1181 13.8081 15.0745 13.8291 15.0308 13.8503L14.0851 11.7526C12.7757 8.84808 9.79438 6.15754 6.99051 5.34995L4.68621 4.68629L5.34987 6.99059C6.15747 9.79438 8.848 12.7757 11.7526 14.0852L13.9244 15.0643C13.908 15.1081 13.8911 15.1516 13.8773 15.1966L11.6426 14.3507C8.66293 13.2228 4.65227 13.4285 2.09861 14.84L0 16L2.09867 17.16C4.65235 18.5717 8.66293 18.7773 11.6427 17.6493L13.9818 16.764C14.0002 16.8043 14.0188 16.8448 14.0395 16.8838L11.7526 17.9149C8.84808 19.2243 6.15755 22.2056 5.34995 25.0094L4.68629 27.3138L6.99059 26.6501C9.79438 25.8426 12.7757 23.152 14.0852 20.2475L15.1465 17.8934C15.1857 17.9098 15.2264 17.9232 15.2668 17.9374L14.3507 20.3574C13.2228 23.3371 13.4285 27.3478 14.84 29.9014L16 32.0002L17.1602 29.9014C18.5717 27.3478 18.7773 23.3373 17.6494 20.3574L16.7333 17.9373C16.7736 17.9232 16.8144 17.9098 16.8536 17.8933L17.9149 20.2474C19.2243 23.152 22.2056 25.8424 25.0094 26.6501L27.3138 27.3138L26.6501 25.0094C25.8426 22.2056 23.152 19.2243 20.2475 17.9147L17.9605 16.8838C17.9813 16.8448 17.9998 16.8043 18.0182 16.7638L20.3573 17.6493Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4318><rect fill=white>`);
var _tmpl$34 = /* @__PURE__ */ template(`<svg><path d="M23.3874 16C25.7899 15.5248 28.1539 14.3506 29.5963 12.8075L31.2339 11.0557L28.8794 10.6009C26.8054 10.2003 24.2027 10.64 21.9797 11.6678C23.6442 9.8711 24.8666 7.53162 25.1264 5.43546L25.4216 3.0557L23.2494 4.07174C21.3362 4.9667 19.489 6.85216 18.2944 8.99037C18.585 6.55851 18.1989 3.94731 17.177 2.09867L16.017 0L14.8569 2.09867C13.835 3.94731 13.4489 6.55851 13.7394 8.99037C12.545 6.85216 10.6977 4.96662 8.78445 4.07174L6.61232 3.0557L6.9074 5.43546C7.16733 7.53162 8.38973 9.8711 10.0542 11.6678C7.83114 10.64 5.22836 10.2004 3.15445 10.6009L0.800003 11.0557L2.43751 12.8075C3.87989 14.3506 6.24388 15.5248 8.64655 16C6.24396 16.4752 3.87989 17.6493 2.43751 19.1925L0.800003 20.9443L3.15445 21.399C5.22836 21.7997 7.83108 21.36 10.0542 20.3322C8.38973 22.129 7.16733 24.4683 6.9074 26.5645L6.61232 28.9442L8.78437 27.9283C10.6977 27.0333 12.5449 25.1478 13.7393 23.0096C13.4488 25.4414 13.8349 28.0526 14.8568 29.9013L16.0168 32L17.1768 29.9013C18.1987 28.0526 18.5848 25.4414 18.2944 23.0096C19.4888 25.1478 21.336 27.0334 23.2493 27.9283L25.4213 28.9442L25.1262 26.5645C24.8662 24.4683 23.6438 22.129 21.9795 20.3322C24.2026 21.36 26.8053 21.7995 28.8792 21.399L31.2336 20.9443L29.5962 19.1925C28.1539 17.6494 25.7899 16.4752 23.3874 16Z"fill=currentColor>`);
var _tmpl$35 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M29.5963 12.8075C28.1539 14.3506 25.7899 15.5248 23.3874 16C25.7899 16.4752 28.1539 17.6494 29.5962 19.1925L31.2336 20.9443L28.8792 21.399C26.8053 21.7995 24.2026 21.36 21.9795 20.3322C23.6438 22.129 24.8662 24.4683 25.1262 26.5645L25.4213 28.9442L23.2493 27.9283C21.336 27.0334 19.4888 25.1478 18.2944 23.0096C18.5848 25.4414 18.1987 28.0526 17.1768 29.9013L16.0168 32L14.8568 29.9013C13.8349 28.0526 13.4488 25.4414 13.7393 23.0096C12.5449 25.1478 10.6977 27.0333 8.78437 27.9283L6.61232 28.9442L6.90739 26.5645C7.16733 24.4683 8.38973 22.129 10.0542 20.3322C7.83107 21.36 5.22835 21.7997 3.15445 21.399L0.799999 20.9443L2.4375 19.1925C3.87989 17.6493 6.24395 16.4752 8.64654 16C6.24387 15.5248 3.87989 14.3506 2.4375 12.8075L0.799999 11.0557L3.15445 10.6009C5.22835 10.2004 7.83115 10.64 10.0542 11.6678C8.38973 9.8711 7.16733 7.53162 6.90739 5.43546L6.61232 3.0557L8.78445 4.07174C10.6977 4.96662 12.545 6.85216 13.7394 8.99037C13.4489 6.55851 13.835 3.94731 14.8568 2.09867L16.017 0L17.177 2.09867C18.1989 3.94731 18.585 6.55851 18.2944 8.99037C19.489 6.85216 21.3362 4.9667 23.2494 4.07174L25.4216 3.0557L25.1264 5.43546C24.8666 7.53162 23.6442 9.8711 21.9797 11.6678C24.2027 10.64 26.8054 10.2003 28.8794 10.6009L31.2339 11.0557L29.5963 12.8075ZM13.0007 18.9914C14.6452 20.6358 17.3115 20.6358 18.956 18.9914C20.6005 17.3469 20.6005 14.6805 18.956 13.036C17.3115 11.3915 14.6452 11.3915 13.0007 13.036C11.3562 14.6805 11.3562 17.3469 13.0007 18.9914Z"fill=currentColor>`);
var _tmpl$36 = /* @__PURE__ */ template(`<svg><path d="M16 0C16.5432 8.60154 23.3984 15.4568 32 16C23.3984 16.5432 16.5432 23.3984 16 32C15.4568 23.3984 8.60154 16.5432 0 16C8.60154 15.4568 15.4568 8.60154 16 0Z"fill=currentColor>`);
var _tmpl$37 = /* @__PURE__ */ template(`<svg><path d="M16 0C16.0022 5.90288 23.1381 8.85867 27.3138 4.68629C23.1413 8.86186 26.0971 15.9977 32 16C26.0971 16.0022 23.1413 23.1381 27.3138 27.3138C23.1381 23.1413 16.0022 26.0971 16 32C15.9977 26.0971 8.86186 23.1413 4.68629 27.3138C8.85867 23.1381 5.90288 16.0022 0 16C5.90288 15.9977 8.85867 8.86186 4.68629 4.68629C8.86186 8.85867 15.9977 5.90288 16 0Z"fill=currentColor>`);
var _tmpl$38 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4344)><path d="M16 27.7981C3.89832 37.911 -5.91099 28.1018 4.20195 16C-5.91099 3.89831 3.89832 -5.911 16 4.20194C28.0994 -5.911 37.9111 3.89831 27.7981 16C37.9111 28.0925 28.0994 37.911 16 27.7981Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4344><rect fill=white>`);
var _tmpl$39 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4346)><path d="M22.3995 22.399C35.2002 35.2003 -3.20018 35.2003 9.60053 22.399C-3.20018 35.2003 -3.20018 -3.19989 9.60053 9.59958C-3.20018 -3.19989 35.2002 -3.19989 22.3995 9.59958C35.2002 -3.19989 35.2002 35.2003 22.3995 22.399Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4346><rect fill=white>`);
var _tmpl$40 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4349)><path d="M16.0031 22.191C2.33034 40.7617 -8.75465 29.6768 9.81254 15.9994C-8.76317 2.32419 2.32182 -8.75648 16.0031 9.80993C29.6757 -8.76287 40.7607 2.32419 22.1935 15.9994C40.7522 29.6768 29.6672 40.7617 16.0031 22.191Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4349><rect fill=white>`);
var _tmpl$41 = /* @__PURE__ */ template(`<svg><path d="M15.9992 32V23.035L0 15.9992H8.96501L15.9992 0V8.96501L32 15.9992H23.035L15.9992 32Z"fill=currentColor>`);
var _tmpl$42 = /* @__PURE__ */ template(`<svg><path d="M15.999 32V29.5102C7.84933 29.5102 0 24.1491 0 16H2.48792C2.48792 7.85085 7.84933 0 15.999 0V2.48979C24.1486 2.48979 32 7.85085 32 16H29.5122C29.5122 24.1491 24.1486 32 15.999 32Z"fill=currentColor>`);
var _tmpl$43 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4355)><path d="M21.6885 25.7391C26.5637 34.0871 5.43828 34.0871 10.3135 25.7391C1.28246 34.0871 -2.08696 30.7138 6.26102 21.6885C-2.08696 26.5637 -2.08696 5.43827 6.26102 10.3135C-2.08696 1.28245 1.28628 -2.08697 10.3135 6.26101C5.43828 -2.08697 26.5637 -2.08697 21.6885 6.26101C30.7195 -2.08697 34.0871 1.28627 25.7391 10.3135C34.0871 5.43827 34.0871 26.5637 25.7391 21.6885C34.0871 30.7176 30.7195 34.0871 21.6885 25.7391Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4355><rect fill=white>`);
var _tmpl$44 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4358)><path d="M18.8769 20.9254C27.5077 35.6915 4.50407 35.6915 13.123 20.9254C-0.0245654 35.6915 -3.69182 32.0257 11.0753 18.8776C-3.69182 27.5088 -3.69182 4.50425 11.0753 13.1236C-3.69182 -0.0245658 -0.0245654 -3.69196 13.123 11.0758C4.49223 -3.69196 27.4958 -3.69196 18.8769 11.0758C32.0245 -3.69196 35.6918 -0.0245658 20.9246 13.1236C35.6918 4.49241 35.6918 27.4969 20.9246 18.8776C35.6918 32.0257 32.0195 35.6915 18.8769 20.9254ZM15.9996 16.0003C15.9998 16.0003 16.0002 16.0005 16.0003 16.0005L16.0005 15.9996C16.0002 15.9996 15.9999 15.9996 15.9996 15.9996C15.9996 15.9999 15.9996 16.0002 15.9996 16.0003Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4358><rect fill=white>`);
var _tmpl$45 = /* @__PURE__ */ template(`<svg><path d="M25.3445 32C21.0315 24.6152 10.9685 24.6152 6.6556 32C8.98979 24.6152 7.38514 23.0107 0 25.3448C7.38514 21.032 7.38514 10.9696 0 6.65694C7.38514 8.98931 8.98979 7.38475 6.6556 0C10.9685 7.38475 21.0315 7.38475 25.3445 0C23.0118 7.38475 24.6166 8.98931 32 6.65694C24.6166 10.9696 24.6166 21.032 32 25.3448C24.6166 23.0107 23.0118 24.6152 25.3445 32Z"fill=currentColor>`);
var _tmpl$46 = /* @__PURE__ */ template(`<svg><path d="M26.435 30.7114C26.499 31.421 24.7251 32.3256 24.167 31.8826C19.3613 28.0686 12.6428 28.0677 7.83602 31.8795C7.27769 32.3222 5.50172 31.4162 5.56548 30.7066C5.85866 27.4435 4.55641 26.1413 1.29337 26.4344C0.583622 26.4982 -0.322398 24.7221 0.120393 24.1638C3.93218 19.3573 3.93113 12.6396 0.117262 7.83424C-0.325691 7.27613 0.578874 5.50203 1.28853 5.56594C4.55513 5.8601 5.85882 4.55799 5.56548 1.29337C5.5017 0.583632 7.27769 -0.322397 7.83602 0.120377C12.6428 3.93224 19.3613 3.9312 24.167 0.117247C24.7251 -0.325686 26.499 0.57888 26.435 1.28853C26.1406 4.55661 27.444 5.86018 30.7114 5.56595C31.421 5.50205 32.3256 7.276 31.8827 7.83415C28.0698 12.6396 28.0686 19.3574 31.8797 24.1638C32.3224 24.7222 31.4163 26.4982 30.7066 26.4344C27.4427 26.1413 26.1408 27.445 26.435 30.7114Z"fill=currentColor>`);
var _tmpl$47 = /* @__PURE__ */ template(`<svg><path d="M20.3424 32C15.9991 32 15.9991 26.7877 11.6558 26.7877C6.65677 26.7877 0 25.3418 0 20.3413C0 15.9982 5.21085 15.9982 5.21085 11.6551C5.21085 6.65822 6.65677 0 11.6576 0C16 0 16 5.21238 20.3442 5.21238C25.3414 5.21238 32 6.65822 32 11.6588C32 16.0019 26.7874 16.0019 26.7874 20.345C26.7854 25.351 25.3414 32 20.3424 32Z"fill=currentColor>`);
var _tmpl$48 = /* @__PURE__ */ template(`<svg><path d="M19.735 32C16 32 16 23.035 12.2649 23.035C7.96595 23.035 0 24.0328 0 19.7341C0 15.9992 8.96387 15.9992 8.96387 12.2643C8.96387 7.96714 7.96595 0 12.2649 0C16 0 16 8.96501 19.735 8.96501C24.0341 8.96501 32 7.96714 32 12.2643C32 15.9992 23.0346 15.9992 23.0346 19.7341C23.0346 24.0328 24.0341 32 19.735 32Z"fill=currentColor>`);
var _tmpl$49 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4369)><path d="M15.9283 3.02539C15.9283 -5.62006 21.3306 6.63515 19.1734 10.3785C21.3344 6.63515 34.6509 5.18629 27.1622 9.50997C34.6509 5.18629 26.7386 16.0003 22.4166 16.0003C26.7386 16.0003 34.6509 26.8085 27.1622 22.4906C34.6509 26.8142 21.3344 25.3654 19.1734 21.6221C21.3344 25.3654 15.9283 37.6206 15.9283 28.9752C15.9283 37.6206 10.5242 25.3654 12.6832 21.6221C10.5223 25.3654 -2.79428 26.8142 4.69437 22.4906C-2.79428 26.8142 5.11815 16.0003 9.44183 16.0003C5.11815 16.0003 -2.79428 5.19202 4.69437 9.50997C-2.79428 5.18629 10.5223 6.63515 12.6832 10.3785C10.5242 6.63133 15.9283 -5.62006 15.9283 3.02539Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4369><rect fill=white>`);
var _tmpl$50 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4372)><path d="M15.9424 10.9571C15.9424 -10.4684 22.5602 4.53765 17.2034 13.8164C22.5602 4.53765 38.8654 2.76538 20.3096 13.479C38.8654 2.76538 29.1797 15.9991 18.4643 15.9991C29.1762 15.9991 38.8654 29.233 20.3096 18.521C38.8654 29.233 22.5602 27.4606 17.2034 18.1819C22.5602 27.4606 15.9424 42.4683 15.9424 21.0411C15.9424 42.4683 9.33334 27.4606 14.6814 18.1819C9.32638 27.4606 -6.97886 29.233 11.5769 18.521C-6.97886 29.233 2.70689 15.9991 13.4222 15.9991C2.70862 15.9991 -6.97886 2.76538 11.5769 13.479C-6.97886 2.76538 9.32638 4.53765 14.6814 13.8164C9.32638 4.53765 15.9424 -10.4684 15.9424 10.9571Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4372><rect fill=white>`);
var _tmpl$51 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4378)><path fill-rule=evenodd clip-rule=evenodd d="M9.81251 15.9994C-8.75469 29.6768 2.33031 40.7617 16.003 22.191C29.6672 40.7617 40.7522 29.6768 22.1934 15.9994C40.7606 2.32418 29.6757 -8.76287 16.003 9.80993C2.32179 -8.75648 -8.76322 2.32418 9.81251 15.9994ZM16 20C18.2091 20 20 18.2091 20 16C20 13.7908 18.2091 12 16 12C13.7909 12 12 13.7908 12 16C12 18.2091 13.7909 20 16 20Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4378><rect fill=white>`);
var _tmpl$52 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M15.9991 29.3938C17.085 30.697 18.1707 32 20.3424 32C25.3414 32 26.7854 25.351 26.7874 20.345C26.7874 18.1734 28.0904 17.0877 29.3936 16.0019C30.6968 14.9161 32 13.8303 32 11.6588C32 6.65822 25.3414 5.21238 20.3442 5.21238C18.1726 5.21238 17.0867 3.9093 16.001 2.60619C14.9151 1.3031 13.8293 0 11.6576 0C6.65677 0 5.21085 6.65822 5.21085 11.6551C5.21085 13.8266 3.90814 14.9124 2.60542 15.9982C1.30271 17.084 0 18.1698 0 20.3413C0 25.3418 6.65677 26.7877 11.6558 26.7877C13.8274 26.7877 14.9133 28.0907 15.9991 29.3938ZM16 21.92C19.2696 21.92 21.92 19.2696 21.92 16C21.92 12.7305 19.2696 10.08 16 10.08C12.7305 10.08 10.08 12.7305 10.08 16C10.08 19.2696 12.7305 21.92 16 21.92Z"fill=currentColor>`);
var _tmpl$53 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4383)><path fill-rule=evenodd clip-rule=evenodd d="M4.20195 16C-5.91099 28.1018 3.89832 37.911 16 27.7981C28.0994 37.911 37.9111 28.0925 27.7981 16C37.9111 3.89831 28.0994 -5.911 16 4.20194C3.89832 -5.911 -5.91099 3.89831 4.20195 16ZM16 21.92C19.2696 21.92 21.92 19.2696 21.92 16C21.92 12.7305 19.2696 10.08 16 10.08C12.7305 10.08 10.08 12.7305 10.08 16C10.08 19.2696 12.7305 21.92 16 21.92Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4383><rect fill=white>`);
var _tmpl$54 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4386)><path fill-rule=evenodd clip-rule=evenodd d="M13.123 20.9254C4.50408 35.6915 27.5077 35.6915 18.8769 20.9254C32.0195 35.6915 35.6918 32.0257 20.9246 18.8777C35.6918 27.4969 35.6918 4.49241 20.9246 13.1236C35.6918 -0.0245627 32.0245 -3.69196 18.8769 11.0758C27.4958 -3.69196 4.49224 -3.69196 13.123 11.0758C-0.0245566 -3.69196 -3.69181 -0.0245627 11.0753 13.1236C-3.69181 4.50425 -3.69181 27.5088 11.0753 18.8777C-3.69181 32.0257 -0.0245566 35.6915 13.123 20.9254ZM16 20C18.2091 20 20 18.2091 20 16C20 13.7908 18.2091 12 16 12C13.7908 12 12 13.7908 12 16C12 18.2091 13.7908 20 16 20Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4386><rect fill=white>`);
var _tmpl$55 = /* @__PURE__ */ template(`<svg><path fill-rule=evenodd clip-rule=evenodd d="M8.11429 0H0.114286V8C0.114286 12.0739 3.15946 15.4366 7.09776 15.936C3.10424 16.3843 6.7524e-07 19.7725 3.49691e-07 23.8858L0 31.8858H8C12.0739 31.8858 15.4366 28.8405 15.936 24.9022C16.3843 28.8958 19.7725 32 23.8858 32H31.8858V24C31.8858 19.9261 28.8405 16.5634 24.9022 16.064C28.8958 15.6157 32 12.2275 32 8.11429V0.114286L24 0.114285C19.9261 0.114285 16.5634 3.15946 16.064 7.09776C15.6157 3.10424 12.2275 0 8.11429 0Z"fill=currentColor>`);
var _tmpl$56 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4392)><path fill-rule=evenodd clip-rule=evenodd d="M16.0619 14.6965C15.3986 6.4696 8.51199 0 0.114279 0C0.114279 8.35878 6.52404 15.2205 14.6965 15.938C6.46959 16.6013 -7.26232e-06 23.488 -7.62939e-06 31.8858C8.35878 31.8858 15.2205 25.476 15.938 17.3035C16.6013 25.5304 23.488 32 31.8858 32C31.8858 23.6413 25.476 16.7795 17.3035 16.0619C25.5304 15.3987 32 8.512 32 0.114286C23.6413 0.114285 16.7795 6.52405 16.0619 14.6965ZM15.9996 16.0003C15.9998 16.0003 16.0002 16.0005 16.0003 16.0005L16.0005 15.9996C16.0002 15.9996 15.9999 15.9996 15.9996 15.9996C15.9996 15.9999 15.9996 16.0002 15.9996 16.0003Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4392><rect fill=white>`);
var _tmpl$57 = /* @__PURE__ */ template(`<svg><g clip-path=url(#clip0_1_4395)><path fill-rule=evenodd clip-rule=evenodd d="M15.9961 16C7.16135 15.9979 -6.85699e-06 8.83526 -7.62939e-06 2.79754e-06L32 0C32 8.83526 24.8387 15.9979 16.0038 16C24.8387 16.0021 32 23.1648 32 32H-6.23063e-06C-6.23063e-06 23.1648 7.16135 16.0021 15.9961 16Z"fill=currentColor></path></g><defs><clipPath id=clip0_1_4395><rect fill=white>`);
var defaultProps = {
  width: 40,
  viewBox: "0 0 32 32",
  fill: "none"
};
var Shape1 = (props) => (() => {
  var _el$ = _tmpl$();
  spread(_el$, mergeProps(defaultProps, props), true);
  return _el$;
})();
var Shape2 = (props) => (() => {
  var _el$2 = _tmpl$2();
  spread(_el$2, mergeProps(defaultProps, props), true);
  return _el$2;
})();
var Shape3 = (props) => (() => {
  var _el$3 = _tmpl$3(), _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild;
  spread(_el$3, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$ = props.width, _v$2 = props.width;
    _v$ !== _p$.e && setAttribute(_el$7, "width", _p$.e = _v$);
    _v$2 !== _p$.t && setAttribute(_el$7, "height", _p$.t = _v$2);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$3;
})();
var Shape4 = (props) => (() => {
  var _el$8 = _tmpl$4();
  spread(_el$8, mergeProps(defaultProps, props), true);
  return _el$8;
})();
var Shape5 = (props) => (() => {
  var _el$9 = _tmpl$5(), _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild;
  spread(_el$9, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$3 = props.width, _v$4 = props.width;
    _v$3 !== _p$.e && setAttribute(_el$11, "width", _p$.e = _v$3);
    _v$4 !== _p$.t && setAttribute(_el$11, "height", _p$.t = _v$4);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$9;
})();
var Shape6 = (props) => (() => {
  var _el$12 = _tmpl$6(), _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild;
  spread(_el$12, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$5 = props.width, _v$6 = props.width;
    _v$5 !== _p$.e && setAttribute(_el$16, "width", _p$.e = _v$5);
    _v$6 !== _p$.t && setAttribute(_el$16, "height", _p$.t = _v$6);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$12;
})();
var Shape7 = (props) => (() => {
  var _el$17 = _tmpl$7();
  spread(_el$17, mergeProps(defaultProps, props), true);
  return _el$17;
})();
var Shape8 = (props) => (() => {
  var _el$18 = _tmpl$8();
  spread(_el$18, mergeProps(defaultProps, props), true);
  return _el$18;
})();
var Shape9 = (props) => (() => {
  var _el$19 = _tmpl$9();
  spread(_el$19, mergeProps(defaultProps, props), true);
  return _el$19;
})();
var Shape10 = (props) => (() => {
  var _el$20 = _tmpl$0();
  spread(_el$20, mergeProps(defaultProps, props), true);
  return _el$20;
})();
var Shape11 = (props) => (() => {
  var _el$21 = _tmpl$1();
  spread(_el$21, mergeProps(defaultProps, props), true);
  return _el$21;
})();
var Shape12 = (props) => (() => {
  var _el$22 = _tmpl$10();
  spread(_el$22, mergeProps(defaultProps, props), true);
  return _el$22;
})();
var Shape13 = (props) => (() => {
  var _el$23 = _tmpl$11();
  spread(_el$23, mergeProps(defaultProps, props), true);
  return _el$23;
})();
var Shape14 = (props) => (() => {
  var _el$24 = _tmpl$12();
  spread(_el$24, mergeProps(defaultProps, props), true);
  return _el$24;
})();
var Shape15 = (props) => (() => {
  var _el$25 = _tmpl$13(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild;
  spread(_el$25, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$7 = props.width, _v$8 = props.width;
    _v$7 !== _p$.e && setAttribute(_el$29, "width", _p$.e = _v$7);
    _v$8 !== _p$.t && setAttribute(_el$29, "height", _p$.t = _v$8);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$25;
})();
var Shape16 = (props) => (() => {
  var _el$30 = _tmpl$14();
  spread(_el$30, mergeProps(defaultProps, props), true);
  return _el$30;
})();
var Shape17 = (props) => (() => {
  var _el$31 = _tmpl$15();
  spread(_el$31, mergeProps(defaultProps, props), true);
  return _el$31;
})();
var Shape18 = (props) => (() => {
  var _el$32 = _tmpl$16();
  spread(_el$32, mergeProps(defaultProps, props), true);
  return _el$32;
})();
var Shape19 = (props) => (() => {
  var _el$33 = _tmpl$17();
  spread(_el$33, mergeProps(defaultProps, props), true);
  return _el$33;
})();
var Shape20 = (props) => (() => {
  var _el$34 = _tmpl$18();
  spread(_el$34, mergeProps(defaultProps, props), true);
  return _el$34;
})();
var Shape21 = (props) => (() => {
  var _el$35 = _tmpl$18();
  spread(_el$35, mergeProps(defaultProps, props), true);
  return _el$35;
})();
var Shape22 = (props) => (() => {
  var _el$36 = _tmpl$19();
  spread(_el$36, mergeProps(defaultProps, props), true);
  return _el$36;
})();
var Shape23 = (props) => (() => {
  var _el$37 = _tmpl$20();
  spread(_el$37, mergeProps(defaultProps, props), true);
  return _el$37;
})();
var Shape24 = (props) => (() => {
  var _el$38 = _tmpl$21();
  spread(_el$38, mergeProps(defaultProps, props), true);
  return _el$38;
})();
var Shape25 = (props) => (() => {
  var _el$39 = _tmpl$22();
  spread(_el$39, mergeProps(defaultProps, props), true);
  return _el$39;
})();
var Shape26 = (props) => (() => {
  var _el$40 = _tmpl$23();
  spread(_el$40, mergeProps(defaultProps, props), true);
  return _el$40;
})();
var Shape27 = (props) => (() => {
  var _el$41 = _tmpl$24(), _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild;
  spread(_el$41, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$9 = props.width, _v$0 = props.width;
    _v$9 !== _p$.e && setAttribute(_el$45, "width", _p$.e = _v$9);
    _v$0 !== _p$.t && setAttribute(_el$45, "height", _p$.t = _v$0);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$41;
})();
var Shape28 = (props) => (() => {
  var _el$46 = _tmpl$25();
  spread(_el$46, mergeProps(defaultProps, props), true);
  return _el$46;
})();
var Shape29 = (props) => (() => {
  var _el$47 = _tmpl$26();
  spread(_el$47, mergeProps(defaultProps, props), true);
  return _el$47;
})();
var Shape30 = (props) => (() => {
  var _el$48 = _tmpl$27(), _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild;
  spread(_el$48, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$1 = props.width, _v$10 = props.width;
    _v$1 !== _p$.e && setAttribute(_el$52, "width", _p$.e = _v$1);
    _v$10 !== _p$.t && setAttribute(_el$52, "height", _p$.t = _v$10);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$48;
})();
var Shape31 = (props) => (() => {
  var _el$53 = _tmpl$28();
  spread(_el$53, mergeProps(defaultProps, props), true);
  return _el$53;
})();
var Shape32 = (props) => (() => {
  var _el$54 = _tmpl$29();
  spread(_el$54, mergeProps(defaultProps, props), true);
  return _el$54;
})();
var Shape33 = (props) => (() => {
  var _el$55 = _tmpl$30(), _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild;
  spread(_el$55, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$11 = props.width, _v$12 = props.width;
    _v$11 !== _p$.e && setAttribute(_el$59, "width", _p$.e = _v$11);
    _v$12 !== _p$.t && setAttribute(_el$59, "height", _p$.t = _v$12);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$55;
})();
var Shape34 = (props) => (() => {
  var _el$60 = _tmpl$31(), _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling, _el$63 = _el$62.firstChild, _el$64 = _el$63.firstChild;
  spread(_el$60, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$13 = props.width, _v$14 = props.width;
    _v$13 !== _p$.e && setAttribute(_el$64, "width", _p$.e = _v$13);
    _v$14 !== _p$.t && setAttribute(_el$64, "height", _p$.t = _v$14);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$60;
})();
var Shape35 = (props) => (() => {
  var _el$65 = _tmpl$32();
  spread(_el$65, mergeProps(defaultProps, props), true);
  return _el$65;
})();
var Shape36 = (props) => (() => {
  var _el$66 = _tmpl$33(), _el$67 = _el$66.firstChild, _el$68 = _el$67.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild;
  spread(_el$66, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$15 = props.width, _v$16 = props.width;
    _v$15 !== _p$.e && setAttribute(_el$70, "width", _p$.e = _v$15);
    _v$16 !== _p$.t && setAttribute(_el$70, "height", _p$.t = _v$16);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$66;
})();
var Shape37 = (props) => (() => {
  var _el$71 = _tmpl$34();
  spread(_el$71, mergeProps(defaultProps, props), true);
  return _el$71;
})();
var Shape38 = (props) => (() => {
  var _el$72 = _tmpl$35();
  spread(_el$72, mergeProps(defaultProps, props), true);
  return _el$72;
})();
var Shape39 = (props) => (() => {
  var _el$73 = _tmpl$36();
  spread(_el$73, mergeProps(defaultProps, props), true);
  return _el$73;
})();
var Shape40 = (props) => (() => {
  var _el$74 = _tmpl$37();
  spread(_el$74, mergeProps(defaultProps, props), true);
  return _el$74;
})();
var Shape41 = (props) => (() => {
  var _el$75 = _tmpl$38(), _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.firstChild;
  spread(_el$75, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$17 = props.width, _v$18 = props.width;
    _v$17 !== _p$.e && setAttribute(_el$79, "width", _p$.e = _v$17);
    _v$18 !== _p$.t && setAttribute(_el$79, "height", _p$.t = _v$18);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$75;
})();
var Shape42 = (props) => (() => {
  var _el$80 = _tmpl$39(), _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild;
  spread(_el$80, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$19 = props.width, _v$20 = props.width;
    _v$19 !== _p$.e && setAttribute(_el$84, "width", _p$.e = _v$19);
    _v$20 !== _p$.t && setAttribute(_el$84, "height", _p$.t = _v$20);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$80;
})();
var Shape43 = (props) => (() => {
  var _el$85 = _tmpl$40(), _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild;
  spread(_el$85, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$21 = props.width, _v$22 = props.width;
    _v$21 !== _p$.e && setAttribute(_el$89, "width", _p$.e = _v$21);
    _v$22 !== _p$.t && setAttribute(_el$89, "height", _p$.t = _v$22);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$85;
})();
var Shape44 = (props) => (() => {
  var _el$90 = _tmpl$41();
  spread(_el$90, mergeProps(defaultProps, props), true);
  return _el$90;
})();
var Shape45 = (props) => (() => {
  var _el$91 = _tmpl$42();
  spread(_el$91, mergeProps(defaultProps, props), true);
  return _el$91;
})();
var Shape46 = (props) => (() => {
  var _el$92 = _tmpl$43(), _el$93 = _el$92.firstChild, _el$94 = _el$93.nextSibling, _el$95 = _el$94.firstChild, _el$96 = _el$95.firstChild;
  spread(_el$92, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$23 = props.width, _v$24 = props.width;
    _v$23 !== _p$.e && setAttribute(_el$96, "width", _p$.e = _v$23);
    _v$24 !== _p$.t && setAttribute(_el$96, "height", _p$.t = _v$24);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$92;
})();
var Shape47 = (props) => (() => {
  var _el$97 = _tmpl$44(), _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling, _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild;
  spread(_el$97, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$25 = props.width, _v$26 = props.width;
    _v$25 !== _p$.e && setAttribute(_el$101, "width", _p$.e = _v$25);
    _v$26 !== _p$.t && setAttribute(_el$101, "height", _p$.t = _v$26);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$97;
})();
var Shape48 = (props) => (() => {
  var _el$102 = _tmpl$45();
  spread(_el$102, mergeProps(defaultProps, props), true);
  return _el$102;
})();
var Shape49 = (props) => (() => {
  var _el$103 = _tmpl$46();
  spread(_el$103, mergeProps(defaultProps, props), true);
  return _el$103;
})();
var Shape50 = (props) => (() => {
  var _el$104 = _tmpl$47();
  spread(_el$104, mergeProps(defaultProps, props), true);
  return _el$104;
})();
var Shape51 = (props) => (() => {
  var _el$105 = _tmpl$48();
  spread(_el$105, mergeProps(defaultProps, props), true);
  return _el$105;
})();
var Shape52 = (props) => (() => {
  var _el$106 = _tmpl$49(), _el$107 = _el$106.firstChild, _el$108 = _el$107.nextSibling, _el$109 = _el$108.firstChild, _el$110 = _el$109.firstChild;
  spread(_el$106, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$27 = props.width, _v$28 = props.width;
    _v$27 !== _p$.e && setAttribute(_el$110, "width", _p$.e = _v$27);
    _v$28 !== _p$.t && setAttribute(_el$110, "height", _p$.t = _v$28);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$106;
})();
var Shape53 = (props) => (() => {
  var _el$111 = _tmpl$50(), _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling, _el$114 = _el$113.firstChild, _el$115 = _el$114.firstChild;
  spread(_el$111, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$29 = props.width, _v$30 = props.width;
    _v$29 !== _p$.e && setAttribute(_el$115, "width", _p$.e = _v$29);
    _v$30 !== _p$.t && setAttribute(_el$115, "height", _p$.t = _v$30);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$111;
})();
var Shape54 = (props) => (() => {
  var _el$116 = _tmpl$51(), _el$117 = _el$116.firstChild, _el$118 = _el$117.nextSibling, _el$119 = _el$118.firstChild, _el$120 = _el$119.firstChild;
  spread(_el$116, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$31 = props.width, _v$32 = props.width;
    _v$31 !== _p$.e && setAttribute(_el$120, "width", _p$.e = _v$31);
    _v$32 !== _p$.t && setAttribute(_el$120, "height", _p$.t = _v$32);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$116;
})();
var Shape55 = (props) => (() => {
  var _el$121 = _tmpl$52();
  spread(_el$121, mergeProps(defaultProps, props), true);
  return _el$121;
})();
var Shape56 = (props) => (() => {
  var _el$122 = _tmpl$53(), _el$123 = _el$122.firstChild, _el$124 = _el$123.nextSibling, _el$125 = _el$124.firstChild, _el$126 = _el$125.firstChild;
  spread(_el$122, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$33 = props.width, _v$34 = props.width;
    _v$33 !== _p$.e && setAttribute(_el$126, "width", _p$.e = _v$33);
    _v$34 !== _p$.t && setAttribute(_el$126, "height", _p$.t = _v$34);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$122;
})();
var Shape57 = (props) => (() => {
  var _el$127 = _tmpl$54(), _el$128 = _el$127.firstChild, _el$129 = _el$128.nextSibling, _el$130 = _el$129.firstChild, _el$131 = _el$130.firstChild;
  spread(_el$127, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$35 = props.width, _v$36 = props.width;
    _v$35 !== _p$.e && setAttribute(_el$131, "width", _p$.e = _v$35);
    _v$36 !== _p$.t && setAttribute(_el$131, "height", _p$.t = _v$36);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$127;
})();
var Shape58 = (props) => (() => {
  var _el$132 = _tmpl$55();
  spread(_el$132, mergeProps(defaultProps, props), true);
  return _el$132;
})();
var Shape59 = (props) => (() => {
  var _el$133 = _tmpl$56(), _el$134 = _el$133.firstChild, _el$135 = _el$134.nextSibling, _el$136 = _el$135.firstChild, _el$137 = _el$136.firstChild;
  spread(_el$133, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$37 = props.width, _v$38 = props.width;
    _v$37 !== _p$.e && setAttribute(_el$137, "width", _p$.e = _v$37);
    _v$38 !== _p$.t && setAttribute(_el$137, "height", _p$.t = _v$38);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$133;
})();
var Shape60 = (props) => (() => {
  var _el$138 = _tmpl$57(), _el$139 = _el$138.firstChild, _el$140 = _el$139.nextSibling, _el$141 = _el$140.firstChild, _el$142 = _el$141.firstChild;
  spread(_el$138, mergeProps(defaultProps, props), true);
  createRenderEffect((_p$) => {
    var _v$39 = props.width, _v$40 = props.width;
    _v$39 !== _p$.e && setAttribute(_el$142, "width", _p$.e = _v$39);
    _v$40 !== _p$.t && setAttribute(_el$142, "height", _p$.t = _v$40);
    return _p$;
  }, {
    e: void 0,
    t: void 0
  });
  return _el$138;
})();

// src/shape/Shape.tsx
var _tmpl$58 = /* @__PURE__ */ template(`<span role=img>`);
var ShapeWrapper = (props) => {
  const style2 = {
    display: "inline-flex",
    "align-items": "center",
    "vertical-align": "middle",
    color: `#${props.color || "currentColor"}`
  };
  return (() => {
    var _el$ = _tmpl$58();
    insert(_el$, () => props.children);
    createRenderEffect((_$p) => style(_el$, style2, _$p));
    return _el$;
  })();
};
var Shape = (props) => {
  const {
    name,
    size = 24
  } = props;
  const Tag = shapes_exports[name];
  if (!Tag) {
    return null;
  }
  return createComponent(ShapeWrapper, mergeProps(props, {
    get children() {
      return createComponent(Tag, {
        width: size * 0.6
      });
    }
  }));
};
var Shape_default = Shape;

// src/index.tsx
var _tmpl$59 = /* @__PURE__ */ template(`<div>`);
var _tmpl$210 = /* @__PURE__ */ template(`<p>`);
var DEFAULTS = {
  style: "character",
  size: 32,
  shadow: false,
  border: false,
  borderSize: 2,
  borderColor: "#fff"
};
var Wrapper = (props) => {
  const style2 = {
    width: `${props.size}px`,
    height: `${props.size}px`,
    "border-radius": `${props.radius || props.size}px`,
    "background-color": `#${props.color}`,
    border: props.border ? `${props.borderSize}px solid ${props.borderColor}` : "none",
    "box-sizing": "border-box",
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    "user-select": "none",
    "box-shadow": props.shadow ? "0px 3px 8px rgba(18, 18, 18, 0.04), 0px 1px 1px rgba(18, 18, 18, 0.02)" : "none"
  };
  return (() => {
    var _el$ = _tmpl$59();
    insert(_el$, () => props.children);
    createRenderEffect((_$p) => style(_el$, style2, _$p));
    return _el$;
  })();
};
var Text = (props) => {
  const style2 = {
    margin: "0",
    padding: "0",
    "text-align": "center",
    "box-sizing": "border-box",
    "font-family": '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    "font-size": `${Math.round(props.size / 100 * 37)}px`,
    color: `#${props.color}`,
    "line-height": "0",
    "text-transform": "uppercase",
    "font-weight": "500"
  };
  return (() => {
    var _el$2 = _tmpl$210();
    insert(_el$2, () => props.children);
    createRenderEffect((_$p) => style(_el$2, style2, _$p));
    return _el$2;
  })();
};
var Avvvatars = (props) => {
  const {
    style: style2 = DEFAULTS.style,
    displayValue,
    value,
    radius,
    size = DEFAULTS.size,
    shadow = DEFAULTS.shadow,
    border = DEFAULTS.border,
    borderSize = DEFAULTS.borderSize,
    borderColor = DEFAULTS.borderColor
  } = props;
  const name = String(displayValue || value).substring(0, 2);
  const key = randomNumber({
    value,
    min: 0,
    max: 19
  });
  const shapeKey = randomNumber({
    value,
    min: 1,
    max: 60
  });
  return createComponent(Wrapper, {
    size,
    get color() {
      return BACKGROUND_COLORS[key];
    },
    shadow,
    border,
    borderSize,
    borderColor,
    radius,
    get children() {
      return style2 === "character" ? createComponent(Text, {
        get color() {
          return TEXT_COLORS[key];
        },
        size,
        children: name
      }) : createComponent(Shape_default, {
        name: `Shape${shapeKey}`,
        get color() {
          return SHAPE_COLORS[key];
        },
        size
      });
    }
  });
};
var src_default = Avvvatars;

export { src_default as default };
