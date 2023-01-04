import { addDataTreeToContext } from "@appsmith/workers/Evaluation/Actions";
import { EvalContext, assignJSFunctionsToContext } from "./evaluate";
import { DataTree } from "entities/DataTree/dataTreeFactory";

class FunctionDeterminer {
  private evalContext: EvalContext = {};

  setupEval(dataTree: DataTree, resolvedFunctions: Record<string, any>) {
    /**** Setting the eval context ****/
    const evalContext: EvalContext = {
      ALLOW_ASYNC: false,
      IS_ASYNC: false,
    };

    addDataTreeToContext({
      dataTree,
      EVAL_CONTEXT: evalContext,
      isTriggerBased: true,
    });

    assignJSFunctionsToContext(evalContext, resolvedFunctions);

    // Set it to self so that the eval function can have access to it
    // as global data. This is what enables access all appsmith
    // entity properties from the global context
    Object.assign(self, evalContext);

    this.evalContext = evalContext;
  }

  setOffEval() {
    for (const entityName in this.evalContext) {
      if (this.evalContext.hasOwnProperty(entityName)) {
        // @ts-expect-error: Types are not available
        delete self[entityName];
      }
    }
  }

  isFunctionAsync(userFunction: unknown, logs: unknown[] = []) {
    self.TRIGGER_COLLECTOR = [];
    self.IS_ASYNC = false;

    return (function() {
      try {
        if (typeof userFunction === "function") {
          if (userFunction.constructor.name === "AsyncFunction") {
            // functions declared with an async keyword
            self.IS_ASYNC = true;
          } else {
            const returnValue = userFunction();
            if (!!returnValue && returnValue instanceof Promise) {
              self.IS_ASYNC = true;
            }
            if (self.TRIGGER_COLLECTOR.length) {
              self.IS_ASYNC = true;
            }
          }
        }
      } catch (e) {
        // We do not want to throw errors for internal operations, to users.
        // logLevel should help us in debugging this.
        logs.push({ error: "Error when determining async function" + e });
      }
      const isAsync = !!self.IS_ASYNC;

      return isAsync;
    })();
  }
}

export const functionDeterminer = new FunctionDeterminer();