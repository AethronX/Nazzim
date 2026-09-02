import { commonDict } from "./common";
import { dataDict } from "./data";
import { extraDict } from "./extra";
import { pagesDict } from "./pages";

/** Arabic source string -> English translation. */
export const dictionary: Record<string, string> = {
  ...commonDict,
  ...dataDict,
  ...pagesDict,
  ...extraDict,
};
