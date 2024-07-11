import {showNotification} from "./Util.js";

interface SaveValueResponse {
    success: boolean;
}

interface LoadValueResponse {
    value: string;
}

export async function saveValue(key: string, value: string): Promise<SaveValueResponse> {
    const url = '/twirp/kv.KVService/SaveValue';

    const data = {
        key: key,
        value: value
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: SaveValueResponse = await response.json();
    showNotification('success', 'notes saved');
    return responseData;
}

export async function loadValue(key: string): Promise<LoadValueResponse> {
    const url = '/twirp/kv.KVService/LoadValue';

    const data = {
        key: key
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: LoadValueResponse = await response.json();
    return responseData;
}
