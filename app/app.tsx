"use client";

import clsx from "clsx";
import { formatDistance } from "date-fns";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

const DB = "waveplates";
const STORE = "games";
const SWR_KEY = "games";

interface Game {
  id: string;
  name: string;
  hitLimitTime: Date;
  maxStamina: number;
  minsPerStamina: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = (event) =>
      (event.target as IDBOpenDBRequest).result.createObjectStore(STORE, {
        keyPath: "id",
      });
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });
}

function dbAction<T, P extends unknown[] = []>(
  callback: (store: IDBObjectStore, ...data: P) => IDBRequest<T>
) {
  return async (...data: P): Promise<T> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = callback(store, ...data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
}

const getAllGames = dbAction<Game[]>((store) => store.getAll());
const addGame = dbAction((store, game: Omit<Game, "id">) =>
  store.add({ ...game, id: nanoid() })
);
const deleteGame = dbAction((store, id: string) => store.delete(id));
const updateGame = dbAction((store, game: Game) => store.put(game));

function parseTimeTillNextStamina(input: string) {
  const [min, sec] = input.split(":").map((x) => Number.parseInt(x));
  return min * 60 + sec;
}

function getHitLimitTime(
  stamina: number,
  rawTimeTillNextStamina: string,
  maxStamina: number,
  minsPerStamina: number
) {
  const timeTillNextStaminaInSec = parseTimeTillNextStamina(
    rawTimeTillNextStamina
  );
  const remainingStamina = maxStamina - stamina - 1;
  const remainingTimeInSec =
    remainingStamina * minsPerStamina * 60 + timeTillNextStaminaInSec;
  return new Date(Date.now() + remainingTimeInSec * 1000);
}

function getCurrentStamina(game: Game, now: Date) {
  const timeDiff = game.hitLimitTime.getTime() - now.getTime();
  const minsPerStaminaInMs = game.minsPerStamina * 60 * 1000;
  const staminaUntilFull = Math.ceil(timeDiff / minsPerStaminaInMs);
  return game.maxStamina - staminaUntilFull;
}

function getFullIn(game: Game, now: Date) {
  return formatDistance(game.hitLimitTime, now);
}

function getNextStaminaIn(game: Game, now: Date) {
  const timeDiff = game.hitLimitTime.getTime() - now.getTime();
  const minsPerStaminaInMs = game.minsPerStamina * 60 * 1000;
  const timeTillNextStaminaInSec = Math.floor(
    (timeDiff % minsPerStaminaInMs) / 1000
  );
  const min = Math.floor(timeTillNextStaminaInSec / 60);
  const sec = timeTillNextStaminaInSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function Label({ ...props }: React.ComponentPropsWithoutRef<"label">) {
  return <label className="flex flex-col gap-1" {...props} />;
}

function Input({ ...props }: React.ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className="w-full bg-transparent outline-none border border-neutral-700 focus-within:border-purple-700 px-3 py-1.5 placeholder:text-neutral-600"
      {...props}
    />
  );
}

function FormControl({
  label,
  helpText,
  ...props
}: {
  label: string;
  helpText?: React.ReactNode;
} & React.ComponentPropsWithoutRef<"input">) {
  return (
    <Label htmlFor={props.id}>
      <span className="font-semibold text-neutral-50">{label}</span>
      <Input {...props} />
      {helpText ? (
        <div className="text-xs text-neutral-500">{helpText}</div>
      ) : null}
    </Label>
  );
}

function Button({
  variant = "primary",
  ...props
}: {
  variant?: "primary" | "green" | "red";
} & React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={clsx(
        "px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-purple-700": variant === "primary",
          "bg-green-900/30": variant === "green",
          "bg-red-900/30": variant === "red",
        }
      )}
      {...props}
    />
  );
}

function AddGameForm({ onFinish }: { onFinish?: () => void }) {
  return (
    <form
      action={async (formData) => {
        function getString(key: string) {
          return (formData.get(key) ?? "") as string;
        }
        function getNumber(key: string) {
          return Number.parseInt((formData.get(key) || "0") as string);
        }
        const name = getString("name");
        const stamina = getNumber("stamina");
        const timeTillNextStamina = getString("timeTillNextStamina");
        const maxStamina = getNumber("maxStamina");
        const minsPerStamina = getNumber("minsPerStamina");
        const hitLimitTime = getHitLimitTime(
          stamina,
          timeTillNextStamina,
          maxStamina,
          minsPerStamina
        );
        await addGame({ name, hitLimitTime, maxStamina, minsPerStamina });
        mutate(SWR_KEY);
        onFinish?.();
      }}
      className="flex flex-col gap-3 [&:invalid_button]:opacity-50 [&:invalid_button]:cursor-not-allowed"
    >
      <FormControl
        label="Name for identification"
        id="name"
        name="name"
        type="text"
        placeholder="Wuwa main account"
        required
      />
      <FormControl
        label="Current stamina count"
        id="stamina"
        name="stamina"
        type="number"
        required
        helpText={
          <>
            Called Trailblaze&nbsp;Power in HSR, Original&nbsp;Resin in
            Genshin&nbsp;Impact, Waveplates in Wuthering&nbsp;Waves
          </>
        }
      />
      <FormControl
        label="Time till next stamina (mm:ss)"
        id="timeTillNextStamina"
        name="timeTillNextStamina"
        type="text"
        pattern="^[0-5]?[0-9]:[0-5][0-9]$"
        title="mm:ss"
        placeholder="03:45"
        required
      />
      <FormControl
        label="Maximum stamina count"
        id="maxStamina"
        name="maxStamina"
        type="number"
        defaultValue={240}
        min={1}
        required
        helpText={
          <>
            240 in HSR and Wuthering&nbsp;Waves, 200 in Genshin.
            #GenshinCouldNever
          </>
        }
      />
      <FormControl
        label="Minutes per stamina gained"
        id="minsPerStamina"
        name="minsPerStamina"
        type="number"
        defaultValue={6}
        min={1}
        required
        helpText={<>6 in HSR and Wuthering&nbsp;Waves, 8 in Genshin</>}
      />
      <Button type="submit">Add</Button>
    </form>
  );
}

function LoadingState() {
  const [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setShowNotice(true), 500);
    return () => clearTimeout(timeout);
  }, []);
  if (!showNotice) return null;
  return (
    <div className="h-full flex flex-col justify-center gap-6 text-center">
      <div>Loading seems to have failed. Please&nbsp;reload.</div>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-neutral-50 text-2xl font-semibold">Welcome!</h1>
      <p>We need some info to set things up.</p>
      <AddGameForm />
    </div>
  );
}

function GameCardLayout({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-neutral-900 flex flex-col gap-6 relative">
      <h2 className="text-neutral-50 text-xl font-semibold text-center">
        {name}
      </h2>
      {children}
    </div>
  );
}

function StaminaDisplay({ current, max }: { current: number; max: number }) {
  return (
    <div className="text-center">
      <span
        suppressHydrationWarning
        className="font-bold text-5xl text-neutral-50"
      >
        {current}
      </span>
      <span className="text-neutral-500 text-xl"> / {max}</span>
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="absolute top-3 right-3 text-neutral-500"
      onClick={onClick}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Delete</title>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}

function GameCard({ game }: { game: Game }) {
  const [now, setNow] = useState(new Date());
  const currentStamina = getCurrentStamina(game, now);
  const fullIn = getFullIn(game, now);
  const nextStaminaIn = getNextStaminaIn(game, now);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNow(now);
    }, 1000);
    return () => clearInterval(interval);
  });
  if (currentStamina >= game.maxStamina) {
    return (
      <GameCardLayout name={game.name}>
        <StaminaDisplay current={currentStamina} max={game.maxStamina} />
        <p className="text-center">
          Data no longer accurate.
          <br />
          Please delete and re-add.
        </p>
        <Button
          onClick={async () => {
            await deleteGame(game.id);
            mutate(SWR_KEY);
          }}
        >
          Delete
        </Button>
      </GameCardLayout>
    );
  }
  return (
    <GameCardLayout name={game.name}>
      <DeleteButton
        onClick={async () => {
          await deleteGame(game.id);
          mutate(SWR_KEY);
        }}
      />
      <div className="flex flex-col">
        <StaminaDisplay current={currentStamina} max={game.maxStamina} />
        <div className="text-center text-neutral-500">
          full in <span suppressHydrationWarning>{fullIn}</span>
        </div>
        <div className="text-center text-neutral-500">
          next stamina in <span suppressHydrationWarning>{nextStaminaIn}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[10, 20, 30, 40, 50, 60].map((value) => (
          <Button
            key={value}
            variant="red"
            disabled={currentStamina < value}
            onClick={async () => {
              if (currentStamina < value) return;
              const newHitLimitTime = new Date(
                game.hitLimitTime.getTime() +
                  value * game.minsPerStamina * 60 * 1000
              );
              await updateGame({ ...game, hitLimitTime: newHitLimitTime });
              mutate(SWR_KEY);
            }}
          >
            &minus;{value}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[10, 20, 30, 40, 50, 60].map((value) => (
          <Button
            key={value}
            variant="green"
            disabled={currentStamina + value > game.maxStamina}
            onClick={async () => {
              if (currentStamina + value > game.maxStamina) return;
              const newHitLimitTime = new Date(
                game.hitLimitTime.getTime() -
                  value * game.minsPerStamina * 60 * 1000
              );
              await updateGame({ ...game, hitLimitTime: newHitLimitTime });
              mutate(SWR_KEY);
            }}
          >
            +{value}
          </Button>
        ))}
      </div>
    </GameCardLayout>
  );
}

function MainScreen({ games }: { games: Game[] }) {
  const [state, setState] = useState<"data" | "add-form">("data");
  if (games.length === 0) return <EmptyState />;
  if (state === "add-form")
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            type="button"
            className="text-purple-400 inline-block"
            onClick={() => setState("data")}
          >
            ← Back
          </button>
        </div>
        <AddGameForm onFinish={() => setState("data")} />
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
      <Button onClick={() => setState("add-form")}>Add another</Button>
    </div>
  );
}

export function App() {
  const { data } = useSWR(SWR_KEY, getAllGames);
  if (!Array.isArray(data)) return <LoadingState />;
  if (data.length === 0) return <EmptyState />;
  return (
    <MainScreen games={data.sort((a, b) => a.name.localeCompare(b.name))} />
  );
}
