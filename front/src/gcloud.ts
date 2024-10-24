export const PROJECT_ID = "hubble-261722";
export const BUCKET = "sdf-ledger-close-meta";

export function authenticate() {
    const params: {[key: string]: string} = {
        scope: "https://www.googleapis.com/auth/devstorage.read_only",
        redirect_uri: "REDIRECT_GOES_HERE",
        prompt: "consent",
        response_type: "code",
        client_id: "CLIENT_ID_GOES_HERE"
    };

    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a GET request.
    form.setAttribute('action', oauth2Endpoint);

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
}
