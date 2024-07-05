export class CouchClient {
    private url = '/couchdb';

    private readonly docs: { [key: string]: Document };
    private readonly callback: (kind: string, doc: Document) => void;
    private readonly dbname: string;

    constructor(
        dbname: string,
        callback: (kind: string, doc: Document) => void
    ) {
        this.dbname = dbname;
        this.docs = {};
        this.callback = callback
    }

    subscribe() {
        const queryString = new URLSearchParams({
            feed: 'eventsource',
            since: 'now',
            include_docs: 'true',
            heartbeat: '5000',
            timeout: '60000'
        }).toString()

        const changesUrl = `${this.url}/${this.dbname}/_changes?${queryString}`;
        const eventSource = new EventSource(
            changesUrl,
            // {withCredentials: true}
        );

        return new Promise((resolve) => {
            eventSource.onopen = (event: Event) => {
                resolve(null);
            }

            eventSource.onmessage = (event: MessageEvent) => {
                // console.log("message");
                const change: CouchDBChangeResponse = JSON.parse(event.data);
                // console.log('Change detected');
                // console.log(JSON.stringify(change));

                // TODO: update sequence number
                this.updateDoc(change.doc);
            };

            eventSource.onerror = (err: Event) => {
                console.error('Error detected:', err);
                eventSource.close(); // TODO: need to reconnect with the highest seen sequence number
                resolve(err); // TODO: think more about this
            };
        });
    }

    private updateDoc(doc: Document) {
        const existing = this.docs[doc._id];
        if (existing === undefined) {
            this.docs[doc._id] = doc;
            const kind = doc._deleted ? "delete" : "new";
            this.callback(kind, doc);
            return;
        }

        const prevRev = getDocRevision(existing);
        const newRev = getDocRevision(doc);

        if (newRev <= prevRev) {
            return;
        }

        this.docs[doc._id] = doc;
        const kind = doc._deleted ? "delete" : "update";
        this.callback(kind, doc);
    }

    async put(doc: any) {
        if (typeof doc._id !== 'string') {
            throw new Error(`doc._id is not string`);
        }

        // console.log("put", doc._id, JSON.stringify(doc));
        const response = await fetch(`${this.url}/${this.dbname}/${doc._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(doc),
            // credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to update document with id ${doc._id}`);
        }

        const data = await response.json();
        // console.log('Document updated:', data);
        return data;
    }

    async delete(doc: any) {
        // TODO: should this be working with _id? Maybe everything needs to be _id.
        if (typeof doc.id !== 'string') {
            throw new Error(`doc.id is not string`);
        }

        if (typeof doc._rev !== 'string') {
            throw new Error(`doc._rev is not string`);
        }

        const response = await fetch(`${this.url}/${this.dbname}/${doc.id}?rev=${doc._rev}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete document with id ${doc.id}`);
        }

        const data = await response.json();
        return data;
    }

    async loadDocs(): Promise<CouchDBAllDocsResponse> {
        const queryString = new URLSearchParams({
            include_docs: 'true',
        }).toString()

        const response = await fetch(`${this.url}/${this.dbname}/_all_docs?${queryString}`, {
            method: 'GET',
            // credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const data: CouchDBAllDocsResponse = await response.json();
        // console.log(JSON.stringify(data));

        data.rows.forEach(row => {
            this.updateDoc(row.doc);
        })

        return data;
    }
}

function getDocRevision(doc: Document): number {
    const partBeforeHyphen = doc._rev.split('-')[0];
    return Number(partBeforeHyphen);
}

interface CouchDBAllDocsResponse {
    total_rows: number;
    offset: number;
    rows: Row[];
}

interface Row {
    id: string;
    key: string;
    value: {
        rev: string;
    };
    doc: Document;
}

export interface Document {
    _id: string;
    _rev: string;
    _deleted?: boolean;

    [key: string]: any;
}

interface CouchDBChangeResponse {
    seq: string;
    id: string;
    changes: Change[];
    doc: Document;
    deleted?: boolean;
}

interface Change {
    rev: string;
}



