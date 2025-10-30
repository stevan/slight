#!/bin/bash
# Run all Slight tests in the t/ directory

echo "Running Slight test suite..."
echo "=============================="
echo

total_tests=0
failed_tests=0

for test_file in t/*.sl; do
    if [ -f "$test_file" ]; then
        echo "Running $test_file..."
        output=$(npm run slight -- -i lib/ "$test_file" 2>&1)

        # Extract the summary line (e.g., "1..38")
        summary=$(echo "$output" | grep "^1\.\.")

        # Check for failures
        if echo "$output" | grep -q "looks like you failed"; then
            failed=$(echo "$output" | grep "looks like you failed" | sed 's/.*failed \([0-9]*\).*/\1/')
            echo "  ❌ FAILED: $failed test(s) failed"
            failed_tests=$((failed_tests + failed))
        else
            echo "  ✅ PASSED"
        fi

        # Extract test count
        if [ -n "$summary" ]; then
            count=$(echo "$summary" | sed 's/1\.\.\([0-9]*\)/\1/')
            total_tests=$((total_tests + count))
            echo "  Tests: $summary"
        fi
        echo
    fi
done

echo "=============================="
echo "Total tests run: $total_tests"
if [ $failed_tests -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ $failed_tests test(s) failed"
    exit 1
fi
