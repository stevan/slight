# Modern Minimal Perl Syntax Specification for Slight

**Version**: 0.1.0
**Status**: Draft Specification
**Target**: Slight Language v2.0

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Lexical Structure](#lexical-structure)
3. [Data Types and Sigils](#data-types-and-sigils)
4. [Literals](#literals)
5. [Operators](#operators)
6. [Variables and Scoping](#variables-and-scoping)
7. [Control Structures](#control-structures)
8. [Functions and Subroutines](#functions-and-subroutines)
9. [Classes and Objects](#classes-and-objects)
10. [Pattern Matching](#pattern-matching)
11. [Regular Expressions](#regular-expressions)
12. [Actor Primitives](#actor-primitives)
13. [GPU Primitives](#gpu-primitives)
14. [Async/Await](#asyncawait)
15. [Module System](#module-system)
16. [Built-in Functions](#built-in-functions)
17. [Grammar Summary](#grammar-summary)
18. [Removed from Perl](#removed-from-perl)
19. [Examples](#examples)

---

## Design Philosophy

### Goals

1. **Familiar** - Perl developers should feel at home
2. **Modern** - Include Perl 7/5.36+ features, drop legacy
3. **Clean** - Remove Unix baggage and special cases
4. **Explicit** - No magic variables or implicit behavior
5. **Concurrent** - Native actor model and GPU primitives
6. **Parseable** - No ambiguities, clear grammar

### What We Keep from Perl

- ✅ Sigils ($, @, %)
- ✅ Rich operators (||=, //, =~, etc.)
- ✅ Postfix conditionals
- ✅ Built-in regex
- ✅ List operators (map, grep, sort)
- ✅ Modern subroutine signatures
- ✅ Modern class syntax (Perl 7 style)
- ✅ Context system (simplified)
- ✅ Fat comma (=>)
- ✅ Block syntax

### What We Remove from Perl

- ❌ Special variables ($_, $`, $&, etc.) - except select few
- ❌ Formats
- ❌ Typeglobs
- ❌ Prototypes
- ❌ Barewords
- ❌ Symbolic references
- ❌ Most of the punctuation variables
- ❌ Indirect object syntax
- ❌ Most magic ($$, ${^}, etc.)

---

## Lexical Structure

### Comments

```perl
# Single-line comment

# Multi-line comments
=begin comment
This is a multi-line comment
Can span multiple lines
=end comment

=pod
POD documentation (kept for docs)
=cut
```

### Whitespace

- Whitespace is generally insignificant (not Python-like)
- Newlines are not significant
- Statements end with semicolons

### Identifiers

```perl
# Valid identifiers
$foo
$foo_bar
$foo123
$CamelCase
$snake_case

# Package-qualified names
$Package::Name::var
Package::Name::function()

# Invalid
$123foo     # Can't start with digit
$foo-bar    # Hyphen not allowed (use underscore)
```

### Keywords

```perl
# Control flow
if elsif else unless while until for foreach
given when default break next last continue return

# Declarations
my our state const
sub async class field method

# Operators (word forms)
and or not xor cmp eq ne lt gt le ge

# Special
use require package import
do eval try catch finally throw

# Actor/Concurrency
spawn send recv self kill alive

# GPU
gpu shader kernel dispatch

# Misc
defined undef exists delete
```

---

## Data Types and Sigils

### Sigil System

```perl
$scalar    # Scalar: number, string, reference, object
@array     # Array/List
%hash      # Hash/Map (associative array)
&sub       # Subroutine reference
```

### Type Hierarchy

```
Value
├── Scalar
│   ├── Number (int, float)
│   ├── String
│   ├── Boolean (true, false)
│   ├── Undef (undef, null, nil)
│   ├── Reference
│   │   ├── Array reference (\@array)
│   │   ├── Hash reference (\%hash)
│   │   └── Code reference (\&sub)
│   └── Object (blessed reference)
├── Array (@array)
└── Hash (%hash)
```

### Sigil Usage

```perl
# Declaration with type
my $num = 42;              # Scalar
my @list = (1, 2, 3);      # Array
my %map = (a => 1, b => 2); # Hash
my &func = sub { };        # Code reference

# Access
$scalar;           # Scalar value
$array[0];         # Array element (scalar context)
$hash{key};        # Hash value (scalar context)
@array;            # Whole array (list context)
%hash;             # Whole hash (list context)
@array[0..2];      # Array slice
@hash{qw(a b)};    # Hash slice

# References
my $aref = \@array;    # Array reference
my $href = \%hash;     # Hash reference
my $sref = \$scalar;   # Scalar reference
my $cref = \&func;     # Code reference

# Dereferencing
@$aref;            # Dereference array ref
%$href;            # Dereference hash ref
$$sref;            # Dereference scalar ref
&$cref();          # Call code ref
$aref->[0];        # Arrow notation for refs
$href->{key};      # Arrow notation for hash refs
```

---

## Literals

### Numbers

```perl
# Integers
42
-17
0
1_000_000       # Underscores for readability

# Hexadecimal
0xFF
0x1A2B

# Octal
0o755

# Binary
0b1010_1100

# Floating point
3.14
-2.5
1.5e10
1.5e-5

# Special
Inf             # Infinity
-Inf            # Negative infinity
NaN             # Not a number
```

### Strings

```perl
# Single-quoted (no interpolation)
'hello'
'can\'t'
'backslash: \\'

# Double-quoted (with interpolation)
"hello world"
"The value is $x"
"Array: @array"
"Hash: $hash{key}"
"Escaped: \n \t \r \\ \""

# Here-docs
my $text = <<'END';
Multi-line string
No interpolation
END

my $interp = <<"END";
Multi-line string
With interpolation: $var
END

# Raw strings (for regex, etc.)
my $raw = q{Raw string with no escaping: \ $ @};
my $qq = qq{Like double-quoted: $var};

# Quote-like operators
qw(foo bar baz)     # Returns ('foo', 'bar', 'baz')
```

### Booleans

```perl
true            # Boolean true
false           # Boolean false

# Truthy/falsy values (like Perl)
# Falsy: undef, 0, "", "0", (), []
# Truthy: everything else
```

### Undef

```perl
undef           # Undefined value
my $x;          # $x is undef
my $y = undef;  # Explicitly undef
```

### Arrays

```perl
# List literal
()                  # Empty list
(1, 2, 3)          # List of numbers
(1..10)            # Range
('a', 'b', 'c')    # List of strings
($x, $y, $z)       # List of variables

# Array constructor
my @array = (1, 2, 3);
my @empty = ();

# Array reference (anonymous)
my $aref = [1, 2, 3];
my $nested = [[1, 2], [3, 4]];
```

### Hashes

```perl
# Hash literal
my %hash = (
    name => 'Alice',
    age  => 30,
    city => 'NYC'
);

# Alternative syntax (comma-separated)
my %alt = (
    'name', 'Alice',
    'age',  30
);

# Hash reference (anonymous)
my $href = {
    name => 'Alice',
    age  => 30
};

# Nested structures
my $person = {
    name => 'Alice',
    address => {
        city  => 'NYC',
        state => 'NY'
    },
    phones => ['555-1234', '555-5678']
};
```

### Code References

```perl
# Anonymous subroutine
my $sub = sub { return $_[0] * 2 };

# With signature
my $add = sub ($x, $y) { return $x + $y };

# Reference to named sub
sub named { }
my $ref = \&named;
```

---

## Operators

### Arithmetic

```perl
$a + $b         # Addition
$a - $b         # Subtraction
$a * $b         # Multiplication
$a / $b         # Division
$a % $b         # Modulo
$a ** $b        # Exponentiation

$a++            # Post-increment
++$a            # Pre-increment
$a--            # Post-decrement
--$a            # Pre-decrement

-$a             # Unary negation
+$a             # Unary plus
```

### String

```perl
$a . $b         # Concatenation
$a x $n         # Repetition (repeat $a, $n times)

$a lt $b        # String less than
$a gt $b        # String greater than
$a le $b        # String less or equal
$a ge $b        # String greater or equal
$a eq $b        # String equal
$a ne $b        # String not equal
$a cmp $b       # String comparison (-1, 0, 1)
```

### Numeric Comparison

```perl
$a < $b         # Less than
$a > $b         # Greater than
$a <= $b        # Less or equal
$a >= $b        # Greater or equal
$a == $b        # Equal
$a != $b        # Not equal
$a <=> $b       # Numeric comparison (-1, 0, 1)
```

### Logical

```perl
$a && $b        # Logical AND (short-circuit)
$a || $b        # Logical OR (short-circuit)
!$a             # Logical NOT
$a // $b        # Defined-OR (returns $a if defined, else $b)

$a and $b       # Low-precedence AND
$a or $b        # Low-precedence OR
not $a          # Low-precedence NOT
$a xor $b       # Exclusive OR
```

### Assignment

```perl
$a = $b         # Simple assignment
$a += $b        # Add and assign
$a -= $b        # Subtract and assign
$a *= $b        # Multiply and assign
$a /= $b        # Divide and assign
$a %= $b        # Modulo and assign
$a **= $b       # Exponentiation and assign
$a .= $b        # Concatenate and assign
$a x= $n        # Repeat and assign

$a ||= $b       # Assign if $a is false
$a //= $b       # Assign if $a is undef
$a &&= $b       # Assign if $a is true
```

### Bitwise

```perl
$a & $b         # Bitwise AND
$a | $b         # Bitwise OR
$a ^ $b         # Bitwise XOR
~$a             # Bitwise NOT
$a << $n        # Left shift
$a >> $n        # Right shift
```

### Range

```perl
1..10           # Range (list context: (1,2,3,...,10))
1..$n           # Range to variable
'a'..'z'        # Character range
```

### Ternary

```perl
$cond ? $true : $false
```

### Smart Match

```perl
$x ~~ @array    # Is $x in @array?
$x ~~ %hash     # Is $x a key in %hash?
$x ~~ $y        # Smart comparison
```

### Regex

```perl
$str =~ /pattern/       # Match
$str =~ s/old/new/      # Substitute
$str =~ tr/a-z/A-Z/     # Transliterate
$str !~ /pattern/       # Negative match
```

### Reference

```perl
\$scalar        # Scalar reference
\@array         # Array reference
\%hash          # Hash reference
\&sub           # Code reference

$ref->method()  # Method call on object
$aref->[0]      # Array element via reference
$href->{key}    # Hash value via reference
$cref->($arg)   # Call code reference
```

### Other

```perl
$x ? $y : $z    # Ternary conditional
$x, $y          # Comma operator (sequence)
$x => $y        # Fat comma (same as ,, but quotes left side)
..              # Range operator
...             # Flip-flop operator (removed in Slight)
qw()            # Quote words
```

---

## Variables and Scoping

### Declaration

```perl
# Lexical (block scope)
my $var = 42;
my @array = (1, 2, 3);
my %hash = (a => 1, b => 2);

# Package (global) scope
our $global = 100;
our @ARGV;

# State variables (persistent across calls)
sub counter {
    state $count = 0;
    return ++$count;
}

# Constants
const $PI = 3.14159;
const @PRIMES = (2, 3, 5, 7, 11);
```

### Scope

```perl
{
    my $x = 10;    # Lexical to this block
    {
        my $x = 20; # Different $x, shadows outer
        print $x;   # 20
    }
    print $x;       # 10
}
# $x not accessible here

our $global = 42;   # Package scope
package Other;
print $main::global; # Access from other package
```

### Multiple Declaration

```perl
my ($x, $y, $z) = (1, 2, 3);
my @values = (4, 5, 6);
my ($a, $b, @rest) = @values;  # $a=4, $b=5, @rest=(6)
```

### List Assignment

```perl
($x, $y) = ($y, $x);           # Swap
my @array = 1..10;
my ($first, @rest) = @array;   # Destructure
my ($x, undef, $z) = @array;   # Skip elements
```

---

## Control Structures

### If/Elsif/Else

```perl
if ($x > 10) {
    print "big";
} elsif ($x > 5) {
    print "medium";
} else {
    print "small";
}

# Postfix form
print "yes" if $condition;
print "no" unless $condition;

# Unless
unless ($error) {
    proceed();
}
```

### While/Until

```perl
while ($condition) {
    # Loop body
    last if $done;      # Break
    next if $skip;      # Continue
    redo;               # Restart iteration (no re-check)
}

until ($done) {
    # Loop until $done is true
}

# Postfix form
do_work() while $condition;
do_work() until $done;
```

### For/Foreach

```perl
# C-style for
for (my $i = 0; $i < 10; $i++) {
    print $i;
}

# Foreach over list
foreach my $item (@array) {
    print $item;
}

# Short form (for = foreach)
for my $x (1..10) {
    print $x;
}

# With $_
for (@array) {
    print $_;  # Default variable
}

# Postfix form
print $_ for @array;
```

### Loop Control

```perl
last;           # Break out of loop
next;           # Skip to next iteration
redo;           # Restart current iteration
continue { };   # Block executed before next iteration
```

### Given/When (Pattern Matching)

```perl
given ($value) {
    when (undef)    { say "undefined" }
    when (0)        { say "zero" }
    when (1..10)    { say "small" }
    when (@array)   { say "in array" }
    when (%hash)    { say "in hash keys" }
    when (/^test/)  { say "matches regex" }
    default         { say "something else" }
}

# Break out early
given ($x) {
    when ($_ > 10) {
        say "big";
        break;  # Exit given block
    }
    default { say "small" }
}
```

### Try/Catch

```perl
try {
    risky_operation();
    might_fail();
} catch ($error) {
    warn "Caught error: $error";
    log_error($error);
} finally {
    cleanup();
}

# Re-throw
try {
    something();
} catch ($e) {
    log($e);
    throw $e;  # Re-throw
}

# Throw exceptions
throw "Error message";
throw { type => 'CustomError', msg => 'Failed' };
```

---

## Functions and Subroutines

### Basic Syntax

```perl
# Traditional (no signature)
sub add {
    my ($x, $y) = @_;
    return $x + $y;
}

# Modern (with signature)
sub add($x, $y) {
    return $x + $y;
}

# Implicit return (last expression)
sub add($x, $y) {
    $x + $y
}
```

### Parameters

```perl
# Required parameters
sub func($a, $b) { }

# Optional parameters (with defaults)
sub greet($name = "World") {
    return "Hello, $name";
}

# Variable number of arguments
sub sum(@numbers) {
    my $total = 0;
    $total += $_ for @numbers;
    return $total;
}

# Named parameters (using hash)
sub configure(%options) {
    my $host = $options{host} // 'localhost';
    my $port = $options{port} // 8080;
    # ...
}
configure(host => '127.0.0.1', port => 3000);

# Mixed
sub process($required, $optional = 10, @rest) { }
```

### Return Values

```perl
# Explicit return
sub func {
    return 42;
}

# Implicit return
sub func {
    42  # Last expression is returned
}

# Multiple return values
sub minmax(@numbers) {
    return (min(@numbers), max(@numbers));
}
my ($min, $max) = minmax(1, 5, 3, 9, 2);

# Early return
sub check($x) {
    return 0 if $x < 0;
    return 1 if $x > 0;
    return 0;  # $x == 0
}
```

### Anonymous Subroutines

```perl
# Anonymous sub
my $double = sub ($x) { return $x * 2 };
print $double->(5);  # 10

# As callback
my @doubled = map { $_ * 2 } @numbers;
my @evens = grep { $_ % 2 == 0 } @numbers;

# Closure
sub make_adder($n) {
    return sub ($x) { return $x + $n };
}
my $add5 = make_adder(5);
print $add5->(10);  # 15
```

### Attributes and Type Hints

```perl
# Type hints (for bytecode optimization)
sub multiply($a :Num, $b :Num) :Num {
    return $a * $b;
}

# Readonly parameters
sub process($data :readonly) {
    # $data cannot be modified
}

# Other attributes
sub exported :export { }       # Export from module
sub memoized :memoize { }      # Cache results
```

---

## Classes and Objects

### Modern Class Syntax (Perl 7 / Corinna style)

```perl
# Basic class
class Point {
    # Fields
    field $x :reader :writer = 0;
    field $y :reader :writer = 0;

    # Methods
    method move($dx, $dy) {
        $x += $dx;
        $y += $dy;
    }

    method distance($other) {
        my $dx = $x - $other->x;
        my $dy = $y - $other->y;
        return sqrt($dx*$dx + $dy*$dy);
    }

    method to_string() {
        return "Point($x, $y)";
    }
}

# Usage
my $p1 = Point->new(x => 3, y => 4);
my $p2 = Point->new(x => 6, y => 8);

$p1->move(1, 1);
print $p1->x;  # 4 (reader)
$p1->x(5);     # 5 (writer)

my $dist = $p1->distance($p2);
```

### Field Attributes

```perl
class Example {
    # Read-only (reader generated)
    field $id :reader;

    # Read-write (reader and writer generated)
    field $name :reader :writer;

    # Private (no accessor)
    field $private;

    # With default value
    field $count :reader = 0;

    # With type hint
    field $value :reader :writer :Num = 0;
}
```

### Constructor

```perl
class Person {
    field $name :reader;
    field $age :reader;

    # Custom constructor
    method BUILDARGS($class, %args) {
        # Validate or transform arguments
        die "Name required" unless exists $args{name};
        return \%args;
    }

    # Post-construction initialization
    method BUILD {
        say "Creating person: $name";
    }
}

my $person = Person->new(name => 'Alice', age => 30);
```

### Inheritance

```perl
class Point3D :isa(Point) {
    field $z :reader :writer = 0;

    # Override method
    method distance($other) {
        my $dx = $self->x - $other->x;
        my $dy = $self->y - $other->y;
        my $dz = $z - $other->z;
        return sqrt($dx*$dx + $dy*$dy + $dz*$dz);
    }

    # Call parent method
    method move($dx, $dy, $dz = 0) {
        $self->SUPER::move($dx, $dy);
        $z += $dz;
    }
}
```

### Roles (Interfaces/Traits)

```perl
role Drawable {
    method draw();  # Abstract method

    method render() {
        $self->setup();
        $self->draw();
        $self->cleanup();
    }
}

class Circle :does(Drawable) {
    field $radius :reader;

    method draw() {
        say "Drawing circle with radius $radius";
    }

    method setup() { say "Setup" }
    method cleanup() { say "Cleanup" }
}
```

### Private Methods

```perl
class BankAccount {
    field $balance :reader = 0;

    # Public method
    method deposit($amount) {
        die "Invalid amount" if $amount <= 0;
        $balance += $amount;
        $self->_log("Deposited $amount");
    }

    # Private method (convention: starts with _)
    method _log($message) {
        say "[LOG] $message";
    }
}
```

### Class Methods (Static)

```perl
class Utils {
    # Class method
    method max($class, @values) {
        my $max = $values[0];
        for my $val (@values) {
            $max = $val if $val > $max;
        }
        return $max;
    }
}

# Call without instance
my $result = Utils->max(1, 5, 3, 9, 2);
```

---

## Pattern Matching

### Given/When (Extended)

```perl
# Match against types
given ($value) {
    when (undef)        { say "undefined" }
    when (:Num)         { say "number: $_" }
    when (:Str)         { say "string: $_" }
    when (:Array)       { say "array of length " . @$_ }
    default             { say "unknown type" }
}

# Match with guards
given ($x) {
    when ($_ > 0)       { say "positive" }
    when ($_ < 0)       { say "negative" }
    when ($_ == 0)      { say "zero" }
}

# Match against patterns
given ($text) {
    when (/^ERROR/)     { handle_error($_) }
    when (/^WARN/)      { handle_warning($_) }
    when (/^INFO/)      { handle_info($_) }
    default             { ignore($_) }
}

# Destructuring
given ($result) {
    when ([:ok, $value]) {
        say "Success: $value";
    }
    when ([:error, $msg]) {
        say "Error: $msg";
    }
}
```

### Match Expression (Alternative Syntax)

```perl
# Match expression (returns value)
my $result = match $value {
    when undef     => "undefined",
    when 0         => "zero",
    when 1..10     => "small",
    when ($_ > 10) => "large",
    default        => "unknown"
};

# With blocks
my $msg = match $status {
    when 200 => {
        log("Success");
        "OK"
    },
    when 404 => "Not Found",
    when 500 => {
        alert("Server error!");
        "Internal Error"
    },
    default => "Unknown Status"
};
```

---

## Regular Expressions

### Basic Matching

```perl
# Match operator
if ($str =~ /pattern/) {
    say "Matched";
}

# Negative match
if ($str !~ /pattern/) {
    say "Did not match";
}

# Bind to variable
my $result = $str =~ /pattern/;  # true or false
```

### Modifiers

```perl
/pattern/i      # Case-insensitive
/pattern/g      # Global (all matches)
/pattern/m      # Multi-line (^ and $ match line boundaries)
/pattern/s      # Single-line (. matches newline)
/pattern/x      # Extended (allow whitespace and comments)

# Combine modifiers
/pattern/igm
```

### Captures

```perl
# Numbered captures
if ($str =~ /(\d+)-(\d+)/) {
    my $first = $1;
    my $second = $2;
}

# Named captures
if ($str =~ /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/) {
    my $year = $+{year};
    my $month = $+{month};
    my $day = $+{day};
}

# Capture in list context
my ($year, $month, $day) = $date =~ /(\d{4})-(\d{2})-(\d{2})/;
```

### Substitution

```perl
# Basic substitution
$str =~ s/old/new/;      # Replace first occurrence
$str =~ s/old/new/g;     # Replace all occurrences
$str =~ s/old/new/gi;    # Case-insensitive, global

# With captures
$str =~ s/(\d+)/$1 * 2/e;  # /e evaluates replacement as code

# Non-destructive
my $new = $str =~ s/old/new/r;  # /r returns modified copy
```

### Transliteration

```perl
# Character translation
$str =~ tr/a-z/A-Z/;     # Lowercase to uppercase
$str =~ tr/aeiou/12345/; # Vowels to numbers

# Count characters
my $count = $str =~ tr/a-z//;  # Count lowercase letters

# Delete characters
$str =~ tr/a-z//d;       # Delete lowercase letters
```

### Advanced Patterns

```perl
# Character classes
/[abc]/         # a, b, or c
/[a-z]/         # Any lowercase letter
/[^0-9]/        # Not a digit
/\d/            # Digit [0-9]
/\w/            # Word character [a-zA-Z0-9_]
/\s/            # Whitespace

# Quantifiers
/a*/            # Zero or more
/a+/            # One or more
/a?/            # Zero or one
/a{3}/          # Exactly 3
/a{3,}/         # 3 or more
/a{3,5}/        # Between 3 and 5

# Anchors
/^pattern/      # Start of string
/pattern$/      # End of string
/\bword\b/      # Word boundary

# Groups
/(pattern)/     # Capturing group
/(?:pattern)/   # Non-capturing group
/(?<name>pat)/  # Named capture

# Alternation
/cat|dog/       # cat or dog

# Lookahead/Lookbehind
/foo(?=bar)/    # Foo followed by bar (lookahead)
/(?<=foo)bar/   # Bar preceded by foo (lookbehind)

# Backreferences
/(\w+)\s+\1/    # Repeated word
```

### Regex as First-Class Values

```perl
# Store regex in variable
my $pattern = qr/\d{4}-\d{2}-\d{2}/;

if ($str =~ $pattern) {
    say "Matched";
}

# Interpolate regex
my $word = "test";
my $regex = qr/\b$word\b/i;
```

---

## Actor Primitives

### Spawn

```perl
# Spawn with code block
my $pid = spawn {
    my $msg = recv();
    send($msg->{from}, $msg->{data} * 2);
};

# Spawn with function reference
sub worker {
    while (my $msg = recv()) {
        process($msg);
    }
}
my $pid = spawn \&worker;

# Spawn with arguments (passed as first message)
my $pid = spawn {
    my $init = recv();  # Initialization data
    my $config = $init->{config};
    # ... worker code
};
send($pid, { config => \%config });

# Spawn multiple
my @workers = map { spawn \&worker } 1..10;
```

### Send

```perl
# Send to process
send($pid, $data);

# Send with timeout (non-blocking)
send($pid, $data, timeout => 1000);

# Send to self
send(self(), $data);

# Broadcast to multiple
for my $pid (@workers) {
    send($pid, $task);
}
```

### Receive

```perl
# Blocking receive
my $msg = recv();

# With timeout (milliseconds)
my $msg = recv(timeout => 1000);
if (!defined $msg) {
    say "Timeout";
}

# Selective receive (pattern matching)
my $msg = recv {
    when ({ type => 'init', data => $_ }) {
        return $_;  # Accept this message
    }
    when ({ type => 'data' }) {
        # Skip this message (leave in mailbox)
        next;
    }
};

# Receive all pending messages
my @messages;
while (my $msg = recv(timeout => 0)) {
    push @messages, $msg;
}
```

### Process Introspection

```perl
# Get current process ID
my $my_pid = self();

# Check if process is alive
if (alive($pid)) {
    say "Process $pid is running";
}

# Kill process
kill($pid);

# List all processes
my @all = processes();
say "Active processes: " . scalar(@all);

# Get process info
my $info = process_info($pid);
say "Mailbox size: " . $info->{mailbox_size};
say "State: " . $info->{state};
```

### Process Links and Monitors

```perl
# Link to process (crash together)
link($pid);

# Unlink
unlink($pid);

# Monitor process (receive exit message)
my $ref = monitor($pid);

# Wait for exit
my $msg = recv();
if ($msg->{type} eq 'DOWN' && $msg->{ref} == $ref) {
    say "Process $pid exited";
}

# Demonitor
demonitor($ref);
```

### Process Groups

```perl
# Create process group
my $group = spawn_group {
    # Worker code
} count => 10;

# Send to all in group
broadcast($group, $message);

# Collect responses
my @responses = collect($group, timeout => 5000);

# Kill all in group
kill_group($group);
```

### Async Process Patterns

```perl
# Request-response pattern
sub request($pid, $data) {
    my $ref = make_ref();
    send($pid, { ref => $ref, data => $data, from => self() });

    # Wait for response with matching ref
    return recv {
        when ({ ref => $ref, response => $_ }) {
            return $_;
        }
    };
}

# Worker pool pattern
class WorkerPool {
    field @workers;
    field $next_worker = 0;

    method BUILD($size) {
        @workers = map { spawn \&worker } 1..$size;
    }

    method submit($task) {
        my $worker = $workers[$next_worker];
        $next_worker = ($next_worker + 1) % scalar(@workers);
        send($worker, $task);
    }
}
```

---

## GPU Primitives

### Shader Creation

```perl
# Create shader from WGSL source
my $shader = gpu::shader(q{
    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        // WGSL code
        let idx = gid.x;
        output[idx] = input[idx] * 2.0;
    }
});

# Create pipeline
my $pipeline = gpu::pipeline($shader, 'main');

# Or combined
my $pipeline = gpu::compile(q{
    // WGSL code
}, entry => 'main');
```

### Buffer Management

```perl
# Create buffer
my $buffer = gpu::buffer(
    size => 1024 * 4,      # Size in bytes
    usage => 'storage'     # 'storage', 'uniform', 'vertex', etc.
);

# Write data to buffer
my @data = (1..1024);
gpu::write($buffer, @data);

# Read data from buffer
my @results = gpu::read($buffer);

# Copy buffer
gpu::copy($source_buffer, $dest_buffer);
```

### Compute Dispatch

```perl
# Dispatch compute shader
gpu::dispatch(
    $pipeline,
    [$input_buffer, $output_buffer],  # Bind group buffers
    [4, 1, 1]                          # Workgroup count (x, y, z)
);

# Wait for completion (implicit in most operations)
gpu::sync();

# Async dispatch
my $fence = gpu::dispatch_async($pipeline, $buffers, $workgroups);
# ... do other work ...
gpu::wait($fence);
```

### High-Level Tensor Operations

```perl
# Create tensor
my $tensor = tensor::from_array(\@data, shape => [32, 32]);

# GPU operations (automatically dispatched)
my $result = $tensor
    ->to_gpu()
    ->map(sub { $_ * 2 })
    ->reduce(sub { $_[0] + $_[1] })
    ->to_cpu();

# Matrix operations
my $c = tensor::matmul($a, $b);  # Automatically uses GPU if beneficial

# Element-wise operations
my $sum = $a + $b;               # Operator overloading
my $prod = $a * $b;
```

### GPU Context Management

```perl
# Get GPU device info
my $info = gpu::info();
say "GPU: " . $info->{name};
say "Max workgroup size: " . $info->{max_workgroup_size};

# Check GPU availability
if (gpu::available()) {
    # Use GPU
} else {
    # Fallback to CPU
}

# Set GPU device (if multiple GPUs)
gpu::use_device(0);  # Use first GPU

# GPU memory management
my $used = gpu::memory_used();
my $total = gpu::memory_total();
say "GPU Memory: $used / $total MB";
```

### GPU-Accelerated Built-ins

```perl
# Automatically use GPU when beneficial
my @sorted = gpu::sort(@large_array);
my $fft = gpu::fft(@signal);
my $filtered = gpu::filter(@image, $kernel);

# Force GPU or CPU
my @result = gpu::force(@data)->sort();  # Always GPU
my @result = cpu::force(@data)->sort();  # Always CPU
```

---

## Async/Await

### Async Functions

```perl
# Async function declaration
async sub fetch_url($url) {
    my $response = await http::get($url);
    return $response->body;
}

# Call async function
my $data = await fetch_url("https://api.example.com");

# Async method
class Downloader {
    async method fetch($url) {
        my $response = await http::get($url);
        return $self->parse($response);
    }
}
```

### Await Expression

```perl
# Await single promise
my $result = await some_async_func();

# Await multiple (parallel)
my ($a, $b, $c) = await (
    fetch_url($url1),
    fetch_url($url2),
    fetch_url($url3)
);

# Await with timeout
my $result = await timeout => 5000, fetch_url($url);

# Await any (race)
my $first = await_any (
    fetch_url($url1),
    fetch_url($url2)
);
```

### Promises

```perl
# Create promise
my $promise = async {
    sleep(1);
    return 42;
};

# Chain promises
my $result = $promise
    ->then(sub { return $_[0] * 2 })
    ->then(sub { return $_[0] + 10 })
    ->catch(sub { warn "Error: $_[0]" });

# Wait for promise
my $value = await $result;
```

### Async Iteration

```perl
# Async generator
async sub fetch_pages(@urls) {
    for my $url (@urls) {
        my $page = await fetch_url($url);
        yield $page;
    }
}

# Consume async generator
async sub process_all {
    for await my $page (fetch_pages(@urls)) {
        process($page);
    }
}
```

### Async Patterns

```perl
# Parallel execution
async sub parallel_fetch(@urls) {
    my @promises = map { fetch_url($_) } @urls;
    return await @promises;
}

# Sequential with accumulation
async sub sequential_process(@items) {
    my @results;
    for my $item (@items) {
        my $result = await process_item($item);
        push @results, $result;
    }
    return \@results;
}

# Error handling
async sub safe_fetch($url) {
    try {
        my $data = await fetch_url($url);
        return [:ok, $data];
    } catch ($e) {
        return [:error, $e];
    }
}
```

---

## Module System

### Package Declaration

```perl
package MyModule;
use v0.1.0;  # Slight version

# Module code here

1;  # Return true for successful load
```

### Importing

```perl
# Import module
use MyModule;

# Import specific symbols
use MyModule qw(func1 func2);

# Import with prefix
use MyModule as => 'MM';
MM::func();

# Import all
use MyModule ':all';

# Conditional import
use MyModule if $condition;
```

### Exporting

```perl
package Math::Utils;

# Export by default
our @EXPORT = qw(add multiply);

# Export on request
our @EXPORT_OK = qw(divide subtract);

# Export groups
our %EXPORT_TAGS = (
    all => [qw(add multiply divide subtract)],
    basic => [qw(add multiply)]
);

sub add($x, $y) :export { return $x + $y }
sub multiply($x, $y) :export { return $x * $y }
sub divide($x, $y) :export_ok { return $x / $y }

1;
```

### Require

```perl
# Require at runtime
require MyModule;

# Conditional require
require MyModule if $some_condition;

# Require version
require v0.2.0;
```

### Module Paths

```perl
# Add to search path
use lib '/path/to/modules';

# Relative to current file
use lib './lib';

# Package manager (slight-pkg)
# Install: slight-pkg install HTTP::Client
use HTTP::Client;
```

### Pragmas

```perl
use strict;           # Strict variable checking
use warnings;         # Enable warnings
use utf8;             # Source is UTF-8
use feature 'say';    # Enable specific features

no strict 'refs';     # Disable strict refs
no warnings 'once';   # Disable specific warnings
```

---

## Built-in Functions

### I/O Functions

```perl
# Print
print "hello";
print "value: $x\n";

# Say (print with newline)
say "hello";

# Printf
printf "Value: %d\n", $x;
printf "%s is %d years old\n", $name, $age;

# Read from stdin
my $line = <STDIN>;
chomp($line);  # Remove newline

# Read all lines
my @lines = <STDIN>;

# File operations (in modules)
use File::IO;
my $fh = File::IO->open('file.txt', 'r');
my $content = $fh->slurp();
$fh->close();
```

### String Functions

```perl
# Length
length($str)

# Substring
substr($str, $offset, $length)
substr($str, $offset)  # To end

# Index
index($str, $substr)
index($str, $substr, $position)
rindex($str, $substr)  # Last occurrence

# Case
uc($str)    # Uppercase
lc($str)    # Lowercase
ucfirst($str)
lcfirst($str)

# Trim
chomp($str)  # Remove trailing newline
chop($str)   # Remove last character

# Split/Join
split(/pattern/, $str)
split(/pattern/, $str, $limit)
join($separator, @list)

# Character
ord($char)              # Character to number
chr($number)            # Number to character
```

### Array Functions

```perl
# Stack operations
push(@array, $value)       # Add to end
pop(@array)                # Remove from end
shift(@array)              # Remove from beginning
unshift(@array, $value)    # Add to beginning

# Slice
@array[0..4]               # Elements 0-4
@array[1, 3, 5]            # Specific elements

# Search
grep { condition } @array  # Filter
map { transform } @array   # Transform
sort { $a <=> $b } @array  # Sort

# Reduce
use List::Util qw(reduce);
reduce { $a + $b } @numbers

# Aggregate
scalar(@array)             # Length
reverse(@array)            # Reverse
join(', ', @array)         # Join to string
```

### Hash Functions

```perl
# Keys/Values
keys(%hash)
values(%hash)
each(%hash)  # Returns key-value pairs

# Exists/Delete
exists($hash{key})
delete($hash{key})

# Slice
@hash{qw(a b c)}  # Get multiple values
```

### Type Functions

```perl
# Reference types
ref($var)          # Returns 'SCALAR', 'ARRAY', 'HASH', 'CODE', etc.
reftype($var)      # Underlying type

# Type checking
defined($var)      # Is defined?
undef($var)        # Undefine variable

# Numeric
int($x)            # Integer part
abs($x)            # Absolute value
sqrt($x)           # Square root
exp($x)            # e^x
log($x)            # Natural log
sin($x), cos($x), tan($x)

# Random
rand()             # Random float 0-1
rand($n)           # Random float 0-$n
int(rand($n))      # Random int 0-$n-1
```

### Process Functions

```perl
# Sleep
sleep($seconds)

# Time
time()             # Unix timestamp
localtime()        # Local time components
gmtime()           # GMT time components

# System
system("command")
exec("command")
```

---

## Grammar Summary

### Expression Grammar (Simplified EBNF)

```ebnf
program         ::= statement*

statement       ::= expr ';'
                 |  declaration ';'
                 |  control_structure
                 |  function_def
                 |  class_def
                 |  package_decl

expr            ::= assignment_expr

assignment_expr ::= logical_or_expr
                 |  lvalue assign_op assignment_expr

logical_or_expr ::= logical_and_expr ('||' logical_and_expr | 'or' logical_and_expr)*

logical_and_expr ::= equality_expr ('&&' equality_expr | 'and' equality_expr)*

equality_expr   ::= relational_expr (('==' | '!=' | 'eq' | 'ne') relational_expr)*

relational_expr ::= additive_expr (('<' | '>' | '<=' | '>=' | 'lt' | 'gt' | 'le' | 'ge') additive_expr)*

additive_expr   ::= mult_expr (('+' | '-' | '.') mult_expr)*

mult_expr       ::= unary_expr (('*' | '/' | '%' | 'x') unary_expr)*

unary_expr      ::= ('!' | 'not' | '-' | '+' | '~') unary_expr
                 |  postfix_expr

postfix_expr    ::= primary_expr postfix_op*

postfix_op      ::= '[' expr ']'
                 |  '{' expr '}'
                 |  '->' identifier
                 |  '->' '[' expr ']'
                 |  '->' '{' expr '}'
                 |  '(' expr_list? ')'
                 |  '++' | '--'

primary_expr    ::= literal
                 |  variable
                 |  '(' expr ')'
                 |  function_call
                 |  array_literal
                 |  hash_literal
                 |  code_ref
                 |  regex_match

variable        ::= scalar_var | array_var | hash_var

scalar_var      ::= '$' identifier

array_var       ::= '@' identifier

hash_var        ::= '%' identifier

lvalue          ::= variable
                 |  array_element
                 |  hash_element
```

### Operator Precedence (Highest to Lowest)

```
1.  () []  {}  ->              (grouping, subscript, method call)
2.  ++ --                      (increment, decrement)
3.  **                         (exponentiation)
4.  ! ~ + - (unary)           (logical not, bitwise not, unary plus/minus)
5.  =~ !~                      (regex match)
6.  * / % x                    (multiply, divide, modulo, repeat)
7.  + - .                      (add, subtract, concatenate)
8.  << >>                      (bit shift)
9.  < > <= >= lt gt le ge      (comparison)
10. == != <=> eq ne cmp        (equality)
11. &                          (bitwise and)
12. | ^                        (bitwise or, xor)
13. &&                         (logical and)
14. ||  //                     (logical or, defined-or)
15. ..                         (range)
16. ?:                         (ternary)
17. = += -= *= /= %= **= etc. (assignment)
18. , =>                       (comma, fat comma)
19. not                        (low-precedence not)
20. and                        (low-precedence and)
21. or xor                     (low-precedence or, xor)
```

---

## Removed from Perl

### Features We Do NOT Include

```perl
# ❌ Special variables (mostly)
$_      # Implicit default - too magical
$`      # Pre-match
$&      # Match
$'      # Post-match
$/      # Input record separator
$\      # Output record separator
$,      # Output field separator
@_      # Subroutine arguments (use signatures instead)
... and 90+ more

# ❌ Formats
format STDOUT = ...

# ❌ Typeglobs
*foo = *bar;
*foo = \&bar;

# ❌ Prototypes
sub myfunc (&@) { }

# ❌ Barewords
use constant FOO => 42;
print FOO;  # Ambiguous

# ❌ Symbolic references
my $var = "foo";
$$var = 42;  # Sets $foo

# ❌ Indirect object syntax
my $obj = new Class;  # Use Class->new() instead

# ❌ Flip-flop operator
$x .. $y  # In scalar context (too obscure)

# ❌ goto
goto LABEL;
goto &sub;

# ❌ Many special file handles
DATA, __END__, __DATA__ sections

# ❌ Study function
study($str);  # Obsolete optimization

# ❌ Tie mechanism (for now)
tie %hash, 'TiedHash';

# ❌ Overload mechanism (replaced with cleaner approach)
use overload '+' => \&add;
```

### Simplified Features

```perl
# ✅ Keep $! for errors (rename to $ERROR)
print $ERROR if $ERROR;

# ✅ Keep @ARGV for arguments
for my $arg (@ARGV) { }

# ✅ Keep $? for exit status (rename to $STATUS)
system("command");
print "Exit: $STATUS";

# ✅ Simplified special variables
$ERROR     # Instead of $!
$STATUS    # Instead of $?
@ARGV      # Command-line arguments
%ENV       # Environment variables
```

---

## Examples

### Example 1: File Processing with Actors

```perl
#!/usr/bin/env slight
use strict;
use warnings;

# Process multiple log files concurrently
sub process_log_file($file) {
    open my $fh, '<', $file or die "Can't open $file: $ERROR";

    my %stats = (
        errors => 0,
        warnings => 0,
        info => 0
    );

    while (my $line = <$fh>) {
        chomp $line;

        given ($line) {
            when (/ERROR/) { $stats{errors}++ }
            when (/WARN/)  { $stats{warnings}++ }
            when (/INFO/)  { $stats{info}++ }
        }
    }

    close $fh;
    return \%stats;
}

# Spawn worker for each file
my @files = glob("logs/*.log");
my @workers = map {
    my $file = $_;
    spawn {
        my $stats = process_log_file($file);
        send(parent(), { file => $file, stats => $stats });
    }
} @files;

# Collect results
my %totals = (errors => 0, warnings => 0, info => 0);

for my $worker (@workers) {
    my $msg = recv();
    say "$msg->{file}:";
    say "  Errors: $msg->{stats}{errors}";
    say "  Warnings: $msg->{stats}{warnings}";
    say "  Info: $msg->{stats}{info}";

    $totals{$_} += $msg->{stats}{$_} for keys %totals;
}

say "\nTotals:";
say "  Errors: $totals{errors}";
say "  Warnings: $totals{warnings}";
say "  Info: $totals{info}";
```

### Example 2: GPU-Accelerated Image Processing

```perl
#!/usr/bin/env slight
use Image::Processing;
use GPU;

class ImageProcessor {
    field $gpu_available = gpu::available();
    field $blur_kernel;

    method BUILD {
        if ($gpu_available) {
            $blur_kernel = gpu::compile(q{
                @compute @workgroup_size(16, 16)
                fn blur(@builtin(global_invocation_id) gid: vec3<u32>) {
                    // Gaussian blur implementation
                    let x = gid.x;
                    let y = gid.y;

                    var sum = vec4<f32>(0.0);
                    for (var dy: i32 = -1; dy <= 1; dy++) {
                        for (var dx: i32 = -1; dx <= 1; dx++) {
                            sum += image[x + dx, y + dy] * kernel[dx+1, dy+1];
                        }
                    }
                    result[x, y] = sum;
                }
            }, entry => 'blur');
        }
    }

    method process(@images) {
        # Spawn worker per image
        my @workers = map {
            my $img = $_;
            spawn {
                my $processed = $self->blur($img);
                return $processed;
            }
        } @images;

        # Collect results
        return map { recv($_) } @workers;
    }

    method blur($image) {
        if ($gpu_available && $image->size > 256*256) {
            return $self->blur_gpu($image);
        } else {
            return $self->blur_cpu($image);
        }
    }

    method blur_gpu($image) {
        my $buffer = gpu::buffer_from_image($image);
        my $result = gpu::buffer(size => $buffer->size);

        gpu::dispatch($blur_kernel, [$buffer, $result],
                     [$image->width / 16, $image->height / 16, 1]);

        return gpu::to_image($result, $image->width, $image->height);
    }

    method blur_cpu($image) {
        # CPU fallback
        my $result = $image->copy();

        for my $y (1..$image->height-2) {
            for my $x (1..$image->width-2) {
                my $sum = [0, 0, 0, 0];

                for my $dy (-1..1) {
                    for my $dx (-1..1) {
                        my $pixel = $image->get($x+$dx, $y+$dy);
                        $sum->[$_] += $pixel->[$_] for 0..3;
                    }
                }

                $result->set($x, $y, [map { $_ / 9 } @$sum]);
            }
        }

        return $result;
    }
}

# Usage
my $processor = ImageProcessor->new();
my @images = Image::load_batch(@ARGV);
my @processed = $processor->process(@images);

for my $i (0..$#images) {
    my $outfile = $ARGV[$i] =~ s/\.jpg$/_blurred.jpg/r;
    $processed[$i]->save($outfile);
    say "Processed: $outfile";
}
```

### Example 3: Concurrent Web Scraper

```perl
#!/usr/bin/env slight
use HTTP::Client;
use HTML::Parser;
use JSON;

class WebScraper {
    field $max_workers = 10;
    field $results = [];

    async method scrape(@urls) {
        # Spawn workers
        my @workers = map {
            spawn {
                while (my $url = recv()) {
                    last if $url eq 'STOP';

                    try {
                        my $data = await $self->fetch_and_parse($url);
                        send(parent(), { url => $url, data => $data });
                    } catch ($e) {
                        send(parent(), { url => $url, error => "$e" });
                    }
                }
            }
        } 1..$max_workers;

        # Distribute URLs to workers
        my $worker_idx = 0;
        for my $url (@urls) {
            send($workers[$worker_idx], $url);
            $worker_idx = ($worker_idx + 1) % $max_workers;
        }

        # Collect results
        for my $url (@urls) {
            my $msg = recv();
            push @$results, $msg;
        }

        # Stop workers
        send($_, 'STOP') for @workers;

        return $results;
    }

    async method fetch_and_parse($url) {
        my $html = await HTTP::Client->get($url);
        my $doc = HTML::Parser->parse($html);

        return {
            title => $doc->find('title')->text,
            links => [$doc->find('a')->map(sub { $_->attr('href') })],
            meta  => {
                description => $doc->find('meta[name="description"]')->attr('content'),
                keywords    => $doc->find('meta[name="keywords"]')->attr('content')
            }
        };
    }

    method save_results($filename) {
        my $json = JSON->encode($results, pretty => 1);
        open my $fh, '>', $filename or die "Can't write $filename: $ERROR";
        print $fh $json;
        close $fh;
    }
}

# Usage
my @urls = qw(
    https://example.com
    https://example.org
    https://example.net
);

my $scraper = WebScraper->new(max_workers => 5);
await $scraper->scrape(@urls);
$scraper->save_results('results.json');

say "Scraped " . scalar(@urls) . " URLs";
```

### Example 4: Real-Time Data Stream Processing

```perl
#!/usr/bin/env slight
use Time::HiRes qw(time);

class StreamProcessor {
    field @workers;
    field $aggregator;
    field $running = 1;

    method start($num_workers) {
        # Spawn processing workers
        @workers = map {
            spawn {
                while (my $data = recv()) {
                    last if $data eq 'STOP';

                    my $processed = $self->process_item($data);
                    send($aggregator, $processed);
                }
            }
        } 1..$num_workers;

        # Spawn aggregator
        $aggregator = spawn {
            my %stats = (
                count => 0,
                sum => 0,
                min => undef,
                max => undef
            );

            while (my $value = recv()) {
                last if $value eq 'STOP';

                $stats{count}++;
                $stats{sum} += $value;
                $stats{min} = $value if !defined($stats{min}) || $value < $stats{min};
                $stats{max} = $value if !defined($stats{max}) || $value > $stats{max};

                # Report every 1000 items
                if ($stats{count} % 1000 == 0) {
                    my $avg = $stats{sum} / $stats{count};
                    say "Processed: $stats{count}, Avg: $avg, Min: $stats{min}, Max: $stats{max}";
                }
            }

            return \%stats;
        };
    }

    method process_item($data) {
        # Transform data
        my $value = $data->{value} * 2;

        # Apply filter
        return undef if $value < 0;

        return $value;
    }

    method submit($data) {
        # Round-robin distribution
        state $next = 0;
        send($workers[$next], $data);
        $next = ($next + 1) % scalar(@workers);
    }

    method stop() {
        $running = 0;
        send($_, 'STOP') for @workers;
        send($aggregator, 'STOP');

        my $stats = recv();
        return $stats;
    }
}

# Main
my $processor = StreamProcessor->new();
$processor->start(10);

# Simulate data stream
my $count = 0;
while ($count < 100000) {
    my $data = {
        timestamp => time(),
        value => rand(100) - 50  # -50 to 50
    };

    $processor->submit($data);
    $count++;
}

# Stop and get final stats
my $stats = $processor->stop();

say "\nFinal Statistics:";
say "  Total processed: $stats->{count}";
say "  Average: " . ($stats->{sum} / $stats->{count});
say "  Min: $stats->{min}";
say "  Max: $stats->{max}";
```

---

## Summary

This specification defines a **Modern Minimal Perl** syntax for Slight that:

1. **Keeps Perl's best features**: Sigils, rich operators, regex, postfix conditionals, modern classes
2. **Removes Perl's cruft**: Special variables, formats, typeglobs, prototypes, barewords
3. **Adds modern features**: Actor primitives, GPU compute, async/await, pattern matching
4. **Remains parseable**: Clear grammar, no ambiguities, explicit syntax
5. **Targets real use cases**: Data processing, concurrent computing, scripting

The result is a language that feels familiar to Perl developers, is accessible to mainstream programmers, and provides unique capabilities for concurrent and GPU-accelerated computing.

**Next Steps:**
1. Implement tokenizer (with sigils and operators)
2. Implement parser (with operator precedence)
3. Extend AST to support new nodes (class, async, spawn, etc.)
4. Integrate with existing bytecode compiler
5. Add standard library modules

This syntax positions Slight as **"Modern Perl for the Concurrent Age"** - a powerful scripting language with native actor concurrency and GPU acceleration.
