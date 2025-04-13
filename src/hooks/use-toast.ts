"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast" // Ensure this path is correct for your project

// --- Configuration ---
const TOAST_LIMIT = 1 // Maximum number of toasts shown at once
const TOAST_REMOVE_DELAY = 5000 // Delay in ms before removing a dismissed toast from state (e.g., 5 seconds)

// --- Types ---
export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  open?: boolean // Ensure 'open' is part of the type
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string } // Ensure id is required for update
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

// --- Reducer (Pure Function) ---
// Manages toast state transitions based on actions. MUST NOT contain side effects.
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Adds a new toast, respecting the TOAST_LIMIT
      return {
        ...state,
        // Add new toast to the beginning, slice ensures the limit is respected
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // Updates specific properties of an existing toast
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      // Sets the 'open' state to false for the target toast(s).
      // The actual removal is handled by a side effect (useEffect) after a delay.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined // Dismiss one or all
            ? { ...t, open: false }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      // Removes a toast entirely from the state.
      if (action.toastId === undefined) {
        // Remove all toasts
        return { ...state, toasts: [] }
      }
      // Remove a specific toast by ID
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    default:
      return state
  }
}

// --- Toast Creator Function (Internal) ---
// Encapsulates the logic for creating and dispatching a single toast
type ToastPayload = Omit<ToasterToast, "id" | "open"> // Properties user can pass

function createToast(
    payload: ToastPayload,
    dispatch: React.Dispatch<Action>,
    idCounterRef: React.MutableRefObject<number>
  ) {
    // Generate a unique ID for the toast
    idCounterRef.current += 1
    const id = idCounterRef.current.toString()

    // Create specific dismiss and update functions for this toast instance
    const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

    const update = (props: Partial<ToasterToast>) =>
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id }, // Ensure ID is included
      })

    // Dispatch the action to add the toast to the state
    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: {
        ...payload, // User-provided properties
        id,
        open: true, // Toasts are initially open
        onOpenChange: (open) => {
            // When the underlying component's state changes (e.g., closed by user action)
            if (!open) {
                dismiss() // Trigger the dismiss process
            }
        },
      },
    })

    // Return controls for this specific toast
    return {
      id: id,
      dismiss,
      update,
    }
}


// --- The Custom Hook ---
function useToast() {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] })
  const idCounterRef = React.useRef<number>(0) // Ref for generating unique IDs

  // Ref to store active removal timeouts. Persists across renders without causing them.
  const toastTimeoutsRef = React.useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Callback to create and dispatch a new toast
  const showToast = React.useCallback(
    (props: ToastPayload) => {
      // Uses the internal creator function
      return createToast(props, dispatch, idCounterRef);
    },
    [dispatch, idCounterRef] // Dependencies for useCallback
  )

  // Public dismiss function (can dismiss specific or all toasts)
  const dismissToast = React.useCallback((toastId?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId })
  }, [dispatch])

  // --- Side Effect for Removal ---
  React.useEffect(() => {
    const timeouts = toastTimeoutsRef.current;

    // Schedule removal for toasts that are marked as closed (`open: false`)
    state.toasts.forEach((toast) => {
      if (toast.open === false && !timeouts.has(toast.id)) {
        // If toast is closed and no removal timeout is active for it
        const timeoutId = setTimeout(() => {
          dispatch({ type: actionTypes.REMOVE_TOAST, toastId: toast.id });
          timeouts.delete(toast.id); // Clean up the map entry
        }, TOAST_REMOVE_DELAY);

        timeouts.set(toast.id, timeoutId); // Store the timeout ID
      }
    });

    // --- Effect Cleanup ---
    // Clears all managed timeouts when the hook unmounts or dependencies change.
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      // It's generally safe to leave the map entries here,
      // as they will be overwritten or ignored on next render/effect run.
      // If memory is a huge concern on frequent state changes, you could clear the map:
      // timeouts.clear();
    };
  }, [state.toasts, dispatch]); // Run when toasts array changes

  // Return state and control functions
  return {
    ...state, // Exposes the `toasts` array
    toast: showToast, // Function to show a new toast
    dismiss: dismissToast, // Function to dismiss toast(s)
  }
}

export { useToast, type ToastPayload } // Export the hook and payload type