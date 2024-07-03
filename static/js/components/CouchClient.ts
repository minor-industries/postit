export class CouchClient {
    private dbname = "my_database" //TODO
    private username = 'admin'; //TODO
    private password = 'mypassword'; //TODO
    private url = 'http://localhost:5984'

    constructor() {
    }

    async connect() {
        const response = await fetch(`${this.url}/_session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `name=${this.username}&password=${this.password}`,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const data = await response.json();
        console.log('Session created', data);
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
        const eventSource = new EventSource(changesUrl, {withCredentials: true});

        return new Promise((resolve) => {
            eventSource.onopen = (event: Event) => {
                resolve(null);
            }

            eventSource.onmessage = (event: MessageEvent) => {
                console.log("message");
                const change = JSON.parse(event.data);
                console.log('Change detected:', change);
            };

            eventSource.onerror = (err: Event) => {
                console.error('Error detected:', err);
                eventSource.close(); // TODO: need to reconnect with the highest seen sequence number
                resolve(err); // TODO: think more about this
            };
        });
    }

    async put(doc: any) {
        throw new Error("not implemented")
    }

    async loadDocs(): Promise<CouchDBAllDocsResponse> {
        const queryString = new URLSearchParams({
            include_docs: 'true',
        }).toString()

        const response = await fetch(`${this.url}/${this.dbname}/_all_docs?${queryString}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const data: CouchDBAllDocsResponse = await response.json();
        console.log(JSON.stringify(data));
        return data;
    }
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

interface Document {
    _id: string;
    _rev: string;

    [key: string]: any;
}

