import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import { SlotType, TodoItem, DailyTask, RecurrenceFrequency } from "@/lib/types";

function todoItemsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "todoItems");
}

function dailyTasksCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "dailyTasks");
}

function dailyTaskCompletionsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "dailyTaskCompletions");
}

export function todayItemsQuery(uid: string, date: string) {
  return query(
    todoItemsCollection(uid),
    where("assignedDate", "==", date),
    orderBy("sortOrder", "asc")
  );
}

export function backlogQuery(uid: string, today: string) {
  return query(
    todoItemsCollection(uid),
    where("slot", "==", "backlog"),
    where("scheduledDate", "<=", today),
    orderBy("completed", "asc"),
    orderBy("sortOrder", "asc")
  );
}

export function scheduledQuery(uid: string, today: string) {
  return query(
    todoItemsCollection(uid),
    where("slot", "==", "backlog"),
    where("scheduledDate", ">", today),
    orderBy("scheduledDate", "asc")
  );
}

export function dailyTasksQuery(uid: string) {
  return query(
    dailyTasksCollection(uid),
    where("active", "==", true),
    orderBy("sortOrder", "asc")
  );
}

export function dailyCompletionsQuery(uid: string, date: string) {
  return query(
    dailyTaskCompletionsCollection(uid),
    where("date", "==", date)
  );
}

export async function addTodoItem(
  uid: string,
  data: {
    title: string;
    description?: string;
    slot: SlotType;
    assignedDate: string | null;
    scheduledDate?: string | null;
    deadline?: string | null;
    recurrence?: RecurrenceFrequency | null;
    sortOrder: number;
  }
): Promise<string> {
  const docRef = await addDoc(todoItemsCollection(uid), {
    title: data.title,
    description: data.description || "",
    slot: data.slot,
    assignedDate: data.assignedDate,
    scheduledDate: data.scheduledDate || null,
    deadline: data.deadline || null,
    completed: false,
    completedAt: null,
    recurrence: data.recurrence || null,
    sortOrder: data.sortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTodoItem(
  uid: string,
  itemId: string,
  data: Partial<Pick<TodoItem, "title" | "description" | "slot" | "assignedDate" | "scheduledDate" | "deadline" | "completed" | "sortOrder" | "recurrence">>,
  fullItem?: TodoItem
) {
  const db = getFirebaseDb();
  const docRef = doc(db, "users", uid, "todoItems", itemId);
  const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.completed === true) {
    updateData.completedAt = Timestamp.now();
  } else if (data.completed === false) {
    updateData.completedAt = null;
  }
  await updateDoc(docRef, updateData);

  if (data.completed === true && fullItem?.recurrence) {
    const nextDate = getNextScheduledDate(
      fullItem.scheduledDate || new Date().toISOString().slice(0, 10),
      fullItem.recurrence
    );
    await addDoc(collection(db, "users", uid, "todoItems"), {
      title: fullItem.title,
      description: fullItem.description,
      slot: "backlog",
      assignedDate: null,
      scheduledDate: nextDate,
      deadline: null,
      completed: false,
      completedAt: null,
      recurrence: fullItem.recurrence,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

function getNextScheduledDate(fromDate: string, frequency: RecurrenceFrequency): string {
  const date = new Date(fromDate + "T00:00:00");
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
  }
  return date.toISOString().slice(0, 10);
}

export async function deleteTodoItem(uid: string, itemId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "users", uid, "todoItems", itemId));
}

export async function addDailyTask(
  uid: string,
  data: { title: string; description?: string; sortOrder: number }
): Promise<string> {
  const docRef = await addDoc(dailyTasksCollection(uid), {
    title: data.title,
    description: data.description || "",
    sortOrder: data.sortOrder,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateDailyTask(
  uid: string,
  taskId: string,
  data: Partial<Pick<DailyTask, "title" | "description" | "sortOrder" | "active">>
) {
  const db = getFirebaseDb();
  const docRef = doc(db, "users", uid, "dailyTasks", taskId);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDailyTask(uid: string, taskId: string) {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "users", uid, "dailyTasks", taskId));
}

export async function toggleDailyTaskCompletion(
  uid: string,
  taskId: string,
  date: string,
  completionId: string | null
) {
  const db = getFirebaseDb();
  if (completionId) {
    await deleteDoc(doc(db, "users", uid, "dailyTaskCompletions", completionId));
  } else {
    await addDoc(dailyTaskCompletionsCollection(uid), {
      taskId,
      date,
      completedAt: serverTimestamp(),
    });
  }
}
