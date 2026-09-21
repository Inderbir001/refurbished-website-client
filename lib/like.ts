// % and _ typed by a visitor are ordinary characters, not LIKE wildcards (and the escape character itself is escaped too).
export const likeEscape = (value: string) => value.replace(/[\\%_]/g, (char) => "\\" + char);
