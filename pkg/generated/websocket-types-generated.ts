// To parse this data:
//
//   import { Convert, Message } from "./file";
//
//   const message = Convert.toMessage(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Message {
    Message:           MessageClass;
    JoinMessage:       JoinMessage;
    CreateRoomMessage: CreateRoomMessage;
    StartMessage:      LeaveMessage;
    AnswerMessage:     AnswerMessage;
    KickMessage:       KickMessageClass;
    LeaveMessage:      LeaveMessage;
    PingMessage:       NgMessage;
    StateMessage:      StateMessage;
    QuestionMessage:   QuestionMessage;
    RevealMessage:     RevealMessage;
    ScoreMessage:      ScoreMessage;
    EndMessage:        EndMessage;
    ErrorMessage:      ErrorMessage;
    PongMessage:       NgMessage;
    JoinedMessage:     JoinedMessage;
    LeftMessage:       KickMessageClass;
    KickedMessage:     KickMessageClass;
    Member:            Member;
    UserStat:          UserStat;
    LeaderEntry:       LeaderEntry;
    QuizSettings:      Settings;
    QuizStats:         QuizStat;
    User:              User;
    RoomState:         RoomState;
    QuizData:          QuizData;
    Question:          Question;
    UserStats:         The123E4567E89B12D3A456426614174000_Class;
    LeaderboardEntry:  LeaderEntry;
    QuizStatistics:    QuizStat;
}

export interface AnswerMessage {
    question_index: number;
    choice:         string;
}

export interface CreateRoomMessage {
    quiz_id:  string;
    settings: Settings;
}

export interface Settings {
    question_duration_ms: number;
    show_correctness:     boolean;
    show_leaderboard:     boolean;
    allow_reconnect:      boolean;
}

export interface EndMessage {
    final_leaderboard: LeaderEntry[];
    quiz_stats:        QuizStat;
}

export interface LeaderEntry {
    user_id:         string;
    display_name:    string;
    score:           number;
    rank:            number;
    correct_answers: number;
    total_answered:  number;
}

export interface QuizStat {
    total_questions:    number;
    total_participants: number;
    average_score:      number;
    completion_rate:    number;
    duration_ms:        number;
}

export interface ErrorMessage {
    code:    string;
    msg:     string;
    details: string;
}

export interface JoinMessage {
    pin:          string;
    display_name: string;
}

export interface JoinedMessage {
    user: Member;
}

export interface Member {
    id:           string;
    display_name: string;
    role:         string;
    score:        number;
    is_online:    boolean;
    joined_at:    number;
}

export interface KickMessageClass {
    user_id: string;
    reason:  string;
}

export interface LeaveMessage {
}

export interface MessageClass {
    v:       number;
    type:    string;
    msg_id:  string;
    room_id: string;
    data:    LeaveMessage;
}

export interface NgMessage {
    timestamp: number;
}

export interface Question {
    index:          number;
    question:       string;
    options:        string[];
    correct_answer: string;
    correct_index:  number;
    explanation:    string;
}

export interface QuestionMessage {
    index:       number;
    question:    string;
    options:     string[];
    deadline_ms: number;
    duration_ms: number;
}

export interface QuizData {
    id:        string;
    title:     string;
    questions: Question[];
}

export interface RevealMessage {
    index:          number;
    correct_choice: string;
    correct_index:  number;
    explanation:    string;
    user_stats:     UserStat[];
    leaderboard:    LeaderEntry[];
}

export interface UserStat {
    user_id:       string;
    display_name:  string;
    answer:        string;
    is_correct:    boolean;
    time_taken_ms: number;
    score_delta:   number;
}

export interface RoomState {
    phase:             string;
    question_index:    number;
    phase_deadline_ms: number;
    start_time:        Date;
    user_scores:       UserScores;
    user_stats:        UserStatsClass;
}

export interface UserScores {
    "123e4567-e89b-12d3-a456-426614174000": number;
}

export interface UserStatsClass {
    "123e4567-e89b-12d3-a456-426614174000": The123E4567E89B12D3A456426614174000_Class;
}

export interface The123E4567E89B12D3A456426614174000_Class {
    correct_answers:          number;
    total_answered:           number;
    average_response_time_ms: number;
    current_streak:           number;
    max_streak:               number;
}

export interface ScoreMessage {
    user_id:     string;
    score:       number;
    score_delta: number;
    rank:        number;
}

export interface StateMessage {
    phase:             string;
    room_id:           string;
    pin:               string;
    host_id:           string;
    question_index:    number;
    total_questions:   number;
    phase_deadline_ms: number;
    members:           Member[];
    settings:          Settings;
}

export interface User {
    id:       string;
    username: string;
    email:    string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toMessage(json: string): Message {
        return cast(JSON.parse(json), r("Message"));
    }

    public static messageToJson(value: Message): string {
        return JSON.stringify(uncast(value, r("Message")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Message": o([
        { json: "Message", js: "Message", typ: r("MessageClass") },
        { json: "JoinMessage", js: "JoinMessage", typ: r("JoinMessage") },
        { json: "CreateRoomMessage", js: "CreateRoomMessage", typ: r("CreateRoomMessage") },
        { json: "StartMessage", js: "StartMessage", typ: r("LeaveMessage") },
        { json: "AnswerMessage", js: "AnswerMessage", typ: r("AnswerMessage") },
        { json: "KickMessage", js: "KickMessage", typ: r("KickMessageClass") },
        { json: "LeaveMessage", js: "LeaveMessage", typ: r("LeaveMessage") },
        { json: "PingMessage", js: "PingMessage", typ: r("NgMessage") },
        { json: "StateMessage", js: "StateMessage", typ: r("StateMessage") },
        { json: "QuestionMessage", js: "QuestionMessage", typ: r("QuestionMessage") },
        { json: "RevealMessage", js: "RevealMessage", typ: r("RevealMessage") },
        { json: "ScoreMessage", js: "ScoreMessage", typ: r("ScoreMessage") },
        { json: "EndMessage", js: "EndMessage", typ: r("EndMessage") },
        { json: "ErrorMessage", js: "ErrorMessage", typ: r("ErrorMessage") },
        { json: "PongMessage", js: "PongMessage", typ: r("NgMessage") },
        { json: "JoinedMessage", js: "JoinedMessage", typ: r("JoinedMessage") },
        { json: "LeftMessage", js: "LeftMessage", typ: r("KickMessageClass") },
        { json: "KickedMessage", js: "KickedMessage", typ: r("KickMessageClass") },
        { json: "Member", js: "Member", typ: r("Member") },
        { json: "UserStat", js: "UserStat", typ: r("UserStat") },
        { json: "LeaderEntry", js: "LeaderEntry", typ: r("LeaderEntry") },
        { json: "QuizSettings", js: "QuizSettings", typ: r("Settings") },
        { json: "QuizStats", js: "QuizStats", typ: r("QuizStat") },
        { json: "User", js: "User", typ: r("User") },
        { json: "RoomState", js: "RoomState", typ: r("RoomState") },
        { json: "QuizData", js: "QuizData", typ: r("QuizData") },
        { json: "Question", js: "Question", typ: r("Question") },
        { json: "UserStats", js: "UserStats", typ: r("The123E4567E89B12D3A456426614174000_Class") },
        { json: "LeaderboardEntry", js: "LeaderboardEntry", typ: r("LeaderEntry") },
        { json: "QuizStatistics", js: "QuizStatistics", typ: r("QuizStat") },
    ], false),
    "AnswerMessage": o([
        { json: "question_index", js: "question_index", typ: 0 },
        { json: "choice", js: "choice", typ: "" },
    ], false),
    "CreateRoomMessage": o([
        { json: "quiz_id", js: "quiz_id", typ: "" },
        { json: "settings", js: "settings", typ: r("Settings") },
    ], false),
    "Settings": o([
        { json: "question_duration_ms", js: "question_duration_ms", typ: 0 },
        { json: "show_correctness", js: "show_correctness", typ: true },
        { json: "show_leaderboard", js: "show_leaderboard", typ: true },
        { json: "allow_reconnect", js: "allow_reconnect", typ: true },
    ], false),
    "EndMessage": o([
        { json: "final_leaderboard", js: "final_leaderboard", typ: a(r("LeaderEntry")) },
        { json: "quiz_stats", js: "quiz_stats", typ: r("QuizStat") },
    ], false),
    "LeaderEntry": o([
        { json: "user_id", js: "user_id", typ: "" },
        { json: "display_name", js: "display_name", typ: "" },
        { json: "score", js: "score", typ: 0 },
        { json: "rank", js: "rank", typ: 0 },
        { json: "correct_answers", js: "correct_answers", typ: 0 },
        { json: "total_answered", js: "total_answered", typ: 0 },
    ], false),
    "QuizStat": o([
        { json: "total_questions", js: "total_questions", typ: 0 },
        { json: "total_participants", js: "total_participants", typ: 0 },
        { json: "average_score", js: "average_score", typ: 3.14 },
        { json: "completion_rate", js: "completion_rate", typ: 3.14 },
        { json: "duration_ms", js: "duration_ms", typ: 0 },
    ], false),
    "ErrorMessage": o([
        { json: "code", js: "code", typ: "" },
        { json: "msg", js: "msg", typ: "" },
        { json: "details", js: "details", typ: "" },
    ], false),
    "JoinMessage": o([
        { json: "pin", js: "pin", typ: "" },
        { json: "display_name", js: "display_name", typ: "" },
    ], false),
    "JoinedMessage": o([
        { json: "user", js: "user", typ: r("Member") },
    ], false),
    "Member": o([
        { json: "id", js: "id", typ: "" },
        { json: "display_name", js: "display_name", typ: "" },
        { json: "role", js: "role", typ: "" },
        { json: "score", js: "score", typ: 0 },
        { json: "is_online", js: "is_online", typ: true },
        { json: "joined_at", js: "joined_at", typ: 0 },
    ], false),
    "KickMessageClass": o([
        { json: "user_id", js: "user_id", typ: "" },
        { json: "reason", js: "reason", typ: "" },
    ], false),
    "LeaveMessage": o([
    ], false),
    "MessageClass": o([
        { json: "v", js: "v", typ: 0 },
        { json: "type", js: "type", typ: "" },
        { json: "msg_id", js: "msg_id", typ: "" },
        { json: "room_id", js: "room_id", typ: "" },
        { json: "data", js: "data", typ: r("LeaveMessage") },
    ], false),
    "NgMessage": o([
        { json: "timestamp", js: "timestamp", typ: 0 },
    ], false),
    "Question": o([
        { json: "index", js: "index", typ: 0 },
        { json: "question", js: "question", typ: "" },
        { json: "options", js: "options", typ: a("") },
        { json: "correct_answer", js: "correct_answer", typ: "" },
        { json: "correct_index", js: "correct_index", typ: 0 },
        { json: "explanation", js: "explanation", typ: "" },
    ], false),
    "QuestionMessage": o([
        { json: "index", js: "index", typ: 0 },
        { json: "question", js: "question", typ: "" },
        { json: "options", js: "options", typ: a("") },
        { json: "deadline_ms", js: "deadline_ms", typ: 0 },
        { json: "duration_ms", js: "duration_ms", typ: 0 },
    ], false),
    "QuizData": o([
        { json: "id", js: "id", typ: "" },
        { json: "title", js: "title", typ: "" },
        { json: "questions", js: "questions", typ: a(r("Question")) },
    ], false),
    "RevealMessage": o([
        { json: "index", js: "index", typ: 0 },
        { json: "correct_choice", js: "correct_choice", typ: "" },
        { json: "correct_index", js: "correct_index", typ: 0 },
        { json: "explanation", js: "explanation", typ: "" },
        { json: "user_stats", js: "user_stats", typ: a(r("UserStat")) },
        { json: "leaderboard", js: "leaderboard", typ: a(r("LeaderEntry")) },
    ], false),
    "UserStat": o([
        { json: "user_id", js: "user_id", typ: "" },
        { json: "display_name", js: "display_name", typ: "" },
        { json: "answer", js: "answer", typ: "" },
        { json: "is_correct", js: "is_correct", typ: true },
        { json: "time_taken_ms", js: "time_taken_ms", typ: 0 },
        { json: "score_delta", js: "score_delta", typ: 0 },
    ], false),
    "RoomState": o([
        { json: "phase", js: "phase", typ: "" },
        { json: "question_index", js: "question_index", typ: 0 },
        { json: "phase_deadline_ms", js: "phase_deadline_ms", typ: 0 },
        { json: "start_time", js: "start_time", typ: Date },
        { json: "user_scores", js: "user_scores", typ: r("UserScores") },
        { json: "user_stats", js: "user_stats", typ: r("UserStatsClass") },
    ], false),
    "UserScores": o([
        { json: "123e4567-e89b-12d3-a456-426614174000", js: "123e4567-e89b-12d3-a456-426614174000", typ: 0 },
    ], false),
    "UserStatsClass": o([
        { json: "123e4567-e89b-12d3-a456-426614174000", js: "123e4567-e89b-12d3-a456-426614174000", typ: r("The123E4567E89B12D3A456426614174000_Class") },
    ], false),
    "The123E4567E89B12D3A456426614174000_Class": o([
        { json: "correct_answers", js: "correct_answers", typ: 0 },
        { json: "total_answered", js: "total_answered", typ: 0 },
        { json: "average_response_time_ms", js: "average_response_time_ms", typ: 0 },
        { json: "current_streak", js: "current_streak", typ: 0 },
        { json: "max_streak", js: "max_streak", typ: 0 },
    ], false),
    "ScoreMessage": o([
        { json: "user_id", js: "user_id", typ: "" },
        { json: "score", js: "score", typ: 0 },
        { json: "score_delta", js: "score_delta", typ: 0 },
        { json: "rank", js: "rank", typ: 0 },
    ], false),
    "StateMessage": o([
        { json: "phase", js: "phase", typ: "" },
        { json: "room_id", js: "room_id", typ: "" },
        { json: "pin", js: "pin", typ: "" },
        { json: "host_id", js: "host_id", typ: "" },
        { json: "question_index", js: "question_index", typ: 0 },
        { json: "total_questions", js: "total_questions", typ: 0 },
        { json: "phase_deadline_ms", js: "phase_deadline_ms", typ: 0 },
        { json: "members", js: "members", typ: a(r("Member")) },
        { json: "settings", js: "settings", typ: r("Settings") },
    ], false),
    "User": o([
        { json: "id", js: "id", typ: "" },
        { json: "username", js: "username", typ: "" },
        { json: "email", js: "email", typ: "" },
    ], false),
};
