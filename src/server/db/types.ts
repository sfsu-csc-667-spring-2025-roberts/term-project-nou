export interface RoomSettings {
  name: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string | null;
  startingCards: number;
  drawUntilPlayable: boolean;
  stacking: boolean;
}
