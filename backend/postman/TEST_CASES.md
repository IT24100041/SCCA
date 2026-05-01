# SPARKLENZ Postman Test Cases

## How to run
1. Start backend server with `npm start` in backend folder.
2. Import `SPARKLENZ.postman_collection.json` into Postman.
3. Run collection folder by folder in this order:
   - Package
   - Subscription
   - User Account
   - Task
   - Payment Record
   - Performance Metric

## Global expected result
- Create endpoints return status `201`
- Read endpoints return status `200`
- Update endpoints return status `200`
- Delete endpoints return status `200`
- Invalid ID should return status `400`
- Not found ID should return status `404`

## Test cases by module

### 1) User Account
- Create user with valid data -> `201`, returns user object with `_id`
- Get all users -> `200`, returns array
- Get user by id -> `200`, returns one user
- Update user role/name -> `200`, returns updated user
- Delete user by id -> `200`, returns delete message
- Get deleted user again -> `404`

### 2) Package
- Create package with allowed `name` (Silver/Gold/Platinum/Diamond) -> `201`
- Create package with invalid name -> `400`
- Get all packages -> `200`
- Get package by id -> `200`
- Update package price -> `200`
- Delete package -> `200`

### 3) Subscription
- Create subscription with valid `packageId` -> `201`
- Create subscription without `packageId` -> `400`
- Get all subscriptions -> `200`
- Get subscription by id -> `200`
- Update subscription status -> `200`
- Delete subscription -> `200`

### 4) Task
- Create task with title and assignedTo -> `201`
- Create task without title -> `400`
- Get all tasks -> `200`
- Get task by id -> `200`
- Update task status to `completed` -> `200`
- Delete task -> `200`

### 5) Payment Record
- Create payment with clientName + amount -> `201`
- Create payment with negative amount -> `400`
- Get all payments -> `200`
- Get payment by id -> `200`
- Update payment status -> `200`
- Delete payment -> `200`

### 6) Performance Metric
- Create metric with campaignName + platform -> `201`
- Create metric with negative impressions -> `400`
- Get all metrics -> `200`
- Get metric by id -> `200`
- Update metric leads -> `200`
- Delete metric -> `200`
