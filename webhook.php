<?php
// GitHub Webhook listener for auto-deploy

$secret = "corplandtechnologies"; // set your own secret (same as GitHub webhook)
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE'] ?? '';

if (!$signature) {
    http_response_code(403);
    exit("No signature");
}

// Get raw POST data
$payload = file_get_contents('php://input');
list($algo, $hash) = explode('=', $signature, 2);

// Verify signature
if (!hash_equals(hash_hmac($algo, $payload, $secret), $hash)) {
    http_response_code(403);
    exit("Invalid signature");
}

// Run deploy script
$output = shell_exec('/bin/bash /home/corpland/id.api.corplandtechnologies.com/deploy.sh 2>&1');

// Log output (optional)
file_put_contents(__DIR__ . "/webhook.log", date('Y-m-d H:i:s') . ":\n" . $output . "\n\n", FILE_APPEND);

echo "Deployed successfully.";
?>
