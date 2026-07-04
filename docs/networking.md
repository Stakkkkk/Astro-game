# Сеть и протокол

## Принцип

Сервер авторитетный. Клиент не может напрямую установить позицию, создать астероид, начислить очки или объявить попадание.

## Частота

- Серверный tick: `20` раз в секунду.
- Клиент отправляет input примерно `20` раз в секунду.
- Сервер отправляет snapshot после каждого tick.

## Client -> Server

```ts
type ClientMessage =
  | { type: "joinRoom"; roomId: string; nickname: string }
  | { type: "input"; seq: number; input: PlayerInput }
  | { type: "ping"; sentAt: number }
  | { type: "leaveRoom" };
```

## Server -> Client

```ts
type ServerMessage =
  | { type: "joinedRoom"; roomId: string; playerId: string; world: WorldConfig }
  | { type: "snapshot"; snapshot: GameSnapshot }
  | { type: "pong"; sentAt: number; serverTime: number }
  | { type: "error"; message: string };
```

## Проверка

1. Открыть клиент в двух вкладках.
2. Подключить обе вкладки к комнате `default`.
3. Двигать корабль в первой вкладке.
4. Убедиться, что вторая вкладка видит движение.
5. Стрелять по астероидам и смотреть на общий score.
