import { Elysia, t } from 'elysia';
import { html } from '@elysiajs/html';
import * as elements from 'typed-html';
import { db } from './db';
import { ToDo, toDos } from './db/schema';
import { eq } from 'drizzle-orm';

const app = new Elysia()
  .use(html())
  .get('/', ({ html }) => html(
    <BaseHtml>
      <body
        class='flex w-full h-screen justify-center items-center'
        hx-get="/todos"
        hx-trigger="load"
        hx-swap="innerHTML"
      />
    </BaseHtml>
  ))
  .post('/clicked', () => <div class='text-blue-600'>I'm from the server</div>)
  .get('/todos', async () => {
    const data = await db.select().from(toDos).all();
    return <ToDoList toDos={data} />
  })
  .post("/todos/toggle/:id",
  async ({ params }) => {
    const oldToDo = await db
      .select()
      .from(toDos)
      .where(eq(toDos.id, params.id))
      .get();
    const newToDo = await db
      .update(toDos)
      .set({ completed: !oldToDo?.completed })
      .where(eq(toDos.id, params.id))
      .returning()
      .get();
      return <ToDoItem {...newToDo} />
  },
  {
    params: t.Object({
      id: t.Numeric(),
    }),
  })
  .delete("/todos/:id",
  async ({ params }) => {
    await db.delete(toDos).where(eq(toDos.id, params.id)).run();
  },
  {
    params: t.Object({
      id: t.Numeric(),
    }),
  })
  .post("/todos",
  async ({ body }) => {
    if (body.content.length === 0) {
      throw new Error("Content cannot be empty");
    }
    const newToDo = await db.insert(toDos).values(body).returning().get();
    return <ToDoItem {...newToDo} />
  },
  {
    body: t.Object({
      content: t.String(),
    }),
  })
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

const BaseHtml = ({ children }: elements.Children) => `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE BETH STACK</title>
  <script src="https://unpkg.com/htmx.org@1.9.6" integrity="sha384-FhXw7b6AlE/jyjlZH5iHa/tTe9EpJ1Y55RjcgPbjeWMskSxZt1v9qkxLJWNJaGni" crossorigin="anonymous"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/hyperscript.org@0.9.11"></script>
</head>

${children}
`

function ToDoItem({ id, content, completed }: ToDo) {
  return (
    <div class='flex flex-row space-x-3'>
      <p>{content}</p>
      <input
        type="checkbox"
        checked={completed}
        hx-post={`/todos/toggle/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      />
      <button
        type="button"
        class='text-red-500'
        hx-delete={`/todos/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      >
        X
      </button>
    </div>
  );
}

function ToDoList({ toDos }: { toDos: ToDo[] }) {
  return (
    <div>
      {toDos.map((toDo) => (
        <ToDoItem {...toDo} />
      ))}
      <ToDoForm />
    </div>
  );
}

function ToDoForm() {
  return (
    <form
      class='flex flex-row space-x-3'
      hx-post="/todos"
      hx-swap="beforebegin"
      _="on submit target.reset()"
    >
      <input type="text" name="content" class='border border-black'/>
      <button type="submit">Add</button>
    </form>
  )
} 