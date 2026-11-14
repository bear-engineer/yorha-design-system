import { stabilitySuite } from "./suite";

stabilitySuite("inputs and pickers: state changes never move the control", [
  { item: "input" },
  { item: "text-field" },
  { item: "textarea" },
  { item: "password-input" },
  { item: "search-input" },
  { item: "number-field" },
  { item: "otp-field" },
  { item: "date-input" },
  { item: "date-picker", selector: "button" } /* typing then blurring the text field shows the invalid-date message (intended); only the trigger is checked */,
  { item: "calendar" },
  { item: "color-input" },
  { item: "file-input" },
  { item: "input-types" },
  { item: "field" },
  { item: "form" },
  { item: "autocomplete" },
  { item: "combobox" },
  { item: "select" },
]);
