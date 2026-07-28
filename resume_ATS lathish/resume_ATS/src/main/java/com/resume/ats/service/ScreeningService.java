package com.resume.ats.service;

import com.resume.ats.model.Applicant;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ScreeningService {

    // Define a dictionary of common skills across various domains (Tech, Business, etc.)
    private static final List<String> SKILL_DICTIONARY = Arrays.asList(
            // Languages
            "java", "python", "javascript", "typescript", "c++", "c#", "ruby", "go", "rust", "kotlin", "swift", "php", 
            "sql", "html", "css", "bash", "r", "scala", "matlab",
            // Frameworks & Libraries
            "spring boot", "spring", "hibernate", "react", "angular", "vue", "node.js", "express", "django", "flask", 
            "rails", "asp.net", "next.js", "bootstrap", "tailwind", "jquery", "nestjs", "fastapi", "redux", "graphql",
            // Databases
            "mysql", "postgresql", "oracle", "mongodb", "redis", "sqlite", "cassandra", "dynamodb", "mariadb",
            // Cloud & DevOps
            "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd", "terraform", "ansible", "linux", 
            "kubernetes", "github actions", "serverless", "cloud",
            // Tools & Version Control
            "git", "github", "gitlab", "jira", "maven", "gradle", "postman", "figma", "webpack", "npm",
            // Methodologies & Fields
            "agile", "scrum", "sdlc", "rest api", "microservices", "system design", "unit testing", "junit", "selenium", 
            "frontend", "backend", "fullstack", "devops", "mobile development", "data science", "machine learning", 
            "artificial intelligence", "deep learning", "cybersecurity", "ui/ux", "quality assurance", "qa",
            // Non-Tech / Business / General
            "marketing", "sales", "finance", "accounting", "excel", "management", "leadership", "communication", 
            "project management", "business analysis", "recruiting", "human resources", "hr", "seo", "content writing",
            "customer service", "negotiation", "teamwork", "problem solving", "strategic planning", "operations"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}"
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}"
    );

    public Applicant screenResume(String resumeText, String jobDescription, String jobRequirements, String jobTitle, Long jobId, String originalFilename) {
        String cleanResume = resumeText.toLowerCase();
        String cleanJob = jobDescription != null ? jobDescription.toLowerCase() : "";

        // 1. Extract candidate info (Name, Email, Phone)
        String email = extractEmail(resumeText);
        String phone = extractPhone(resumeText);
        String name = extractName(resumeText, originalFilename);

        // 2. Extract job skills and resume skills
        // a. Extract predefined skills using dictionary
        Set<String> dictionarySkills = extractSkills(cleanJob + " " + (jobRequirements != null ? jobRequirements.toLowerCase() : ""));
        // b. Extract custom skills specified in requirements
        Set<String> customSkills = extractCustomSkills(jobRequirements);

        // Combine job skills
        Set<String> jobSkills = new LinkedHashSet<>(customSkills);
        jobSkills.addAll(dictionarySkills);

        // Match resume against all jobSkills
        Set<String> resumeSkills = new LinkedHashSet<>();
        for (String skill : jobSkills) {
            String escapedSkill = Pattern.quote(skill);
            String regex;
            if (skill.contains("+") || skill.contains(".") || skill.contains("#")) {
                regex = "(^|\\s|\\p{Punct})" + escapedSkill + "($|\\s|\\p{Punct})";
            } else {
                regex = "\\b" + escapedSkill + "\\b";
            }
            
            Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(cleanResume).find()) {
                resumeSkills.add(skill);
            }
        }

        // 3. Compute score and match details
        Set<String> matched = new HashSet<>(resumeSkills); // Already filtered subset

        Set<String> missing = new HashSet<>(jobSkills);
        missing.removeAll(resumeSkills); // Difference

        int score = 0;
        if (!jobSkills.isEmpty()) {
            score = (int) Math.round(((double) matched.size() / jobSkills.size()) * 100.0);
        } else {
            // Fallback: If no skills found in job description, calculate simple similarity score based on resume length and match
            score = Math.min(100, Math.max(10, (int) (cleanResume.length() > 500 ? 50 : 20)));
        }

        // Ensure score is within valid limits
        score = Math.min(100, Math.max(0, score));

        // Format matched and missing lists for display
        String matchedSkillsStr = matched.stream()
                .map(this::capitalizeWord)
                .collect(Collectors.joining(", "));

        String missingSkillsStr = missing.stream()
                .map(this::capitalizeWord)
                .collect(Collectors.joining(", "));

        // 4. Generate feedback
        String feedback = generateFeedback(score, matched, missing, jobTitle);

        Applicant applicant = new Applicant();
        applicant.setName(name);
        applicant.setEmail(email.isEmpty() ? "not-found@example.com" : email);
        applicant.setPhone(phone.isEmpty() ? "N/A" : phone);
        applicant.setResumeFileName(originalFilename);
        applicant.setScore(score);
        applicant.setMatchedSkills(matchedSkillsStr);
        applicant.setMissingSkills(missingSkillsStr);
        applicant.setFeedback(feedback);
        applicant.setJobId(jobId);
        applicant.setJobTitle(jobTitle);
        applicant.setStatus("SCREENING");

        return applicant;
    }

    private Set<String> extractCustomSkills(String requirementsText) {
        if (requirementsText == null || requirementsText.trim().isEmpty()) {
            return Collections.emptySet();
        }
        Set<String> customSkills = new LinkedHashSet<>();
        String[] lines = requirementsText.split("\\r?\\n");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;
            
            // Clean up common bullet points and numbering at start: "-", "*", "1.", "2."
            line = line.replaceAll("^[\\-\\*\\•\\d\\.\\s]+", "").trim();
            if (line.isEmpty()) continue;
            
            // Limit to reasonable length (e.g. skip very long paragraphs, only keep phrases under 50 chars)
            if (line.length() < 50) {
                customSkills.add(line.toLowerCase());
            }
        }
        return customSkills;
    }

    private Set<String> extractSkills(String text) {
        Set<String> foundSkills = new HashSet<>();
        for (String skill : SKILL_DICTIONARY) {
            // Using regex word boundaries where appropriate to avoid partial matching (e.g. "go" in "good")
            // For skills containing symbols like C++ or .NET, match specifically
            String escapedSkill = Pattern.quote(skill);
            String regex;
            if (skill.contains("+") || skill.contains(".") || skill.contains("#")) {
                regex = "(^|\\s|\\p{Punct})" + escapedSkill + "($|\\s|\\p{Punct})";
            } else {
                regex = "\\b" + escapedSkill + "\\b";
            }
            
            Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(text).find()) {
                foundSkills.add(skill);
            }
        }
        return foundSkills;
    }

    private String extractEmail(String text) {
        Matcher matcher = EMAIL_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return "";
    }

    private String extractPhone(String text) {
        Matcher matcher = PHONE_PATTERN.matcher(text);
        if (matcher.find()) {
            String match = matcher.group().trim();
            // Basic validation to filter out short number patterns like zip codes or dates
            if (match.replaceAll("[^\\d]", "").length() >= 7) {
                return match;
            }
        }
        return "";
    }

    private String extractName(String text, String filename) {
        String[] lines = text.split("\\r?\\n");
        for (int i = 0; i < Math.min(lines.length, 10); i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            // Skip lines containing typical resume header keywords
            String lower = line.toLowerCase();
            if (lower.contains("resume") || lower.contains("curriculum") || lower.contains("vitae") ||
                lower.contains("email") || lower.contains("phone") || lower.contains("contact") ||
                lower.contains("page") || lower.contains("profile") || lower.contains("github") ||
                lower.contains("linkedin") || lower.contains("portfolio") || EMAIL_PATTERN.matcher(line).find() ||
                PHONE_PATTERN.matcher(line).find()) {
                continue;
            }

            // A typical name has 2-4 words, starts with capitals, and contains only letters
            String[] words = line.split("\\s+");
            if (words.length >= 2 && words.length <= 4) {
                boolean allWordsAlpha = true;
                for (String word : words) {
                    if (!word.matches("^[a-zA-Z\\p{L}]+$")) {
                        allWordsAlpha = false;
                        break;
                    }
                }
                if (allWordsAlpha) {
                    return line;
                }
            }
        }

        // Fallback to filename (clean up extension and format)
        if (filename != null) {
            String namePart = filename;
            int lastDot = filename.lastIndexOf('.');
            if (lastDot > 0) {
                namePart = filename.substring(0, lastDot);
            }
            // Replace underscores, dashes with space
            namePart = namePart.replaceAll("[_-]", " ");
            // Capitalize words
            return Arrays.stream(namePart.split("\\s+"))
                    .map(this::capitalizeWord)
                    .collect(Collectors.joining(" "));
        }

        return "Unknown Candidate";
    }

    private String generateFeedback(int score, Set<String> matched, Set<String> missing, String jobTitle) {
        StringBuilder sb = new StringBuilder();
        sb.append("This candidate's resume matches **").append(score).append("%** of the requirements for the **").append(jobTitle).append("** role.\n\n");

        if (score >= 80) {
            sb.append("### Strong Alignment\n");
            sb.append("This candidate shows excellent keyword alignment. Key technologies matched: ");
            sb.append(matched.stream().limit(5).map(this::capitalizeWord).collect(Collectors.joining(", "))).append(".\n");
            sb.append("They possess the core skills required and are highly recommended for an interview.");
        } else if (score >= 50) {
            sb.append("### Moderate Alignment\n");
            sb.append("The candidate has some matching qualifications (e.g. ");
            sb.append(matched.stream().limit(4).map(this::capitalizeWord).collect(Collectors.joining(", "))).append("), ");
            if (!missing.isEmpty()) {
                sb.append("but lacks coverage in key areas such as: **");
                sb.append(missing.stream().limit(3).map(this::capitalizeWord).collect(Collectors.joining(", "))).append("**.");
            } else {
                sb.append("but the resume density of keywords is moderate.");
            }
            sb.append("\n\n**Recommendation:** Consider conducting a screening call to evaluate their knowledge of the missing areas.");
        } else {
            sb.append("### Low Alignment\n");
            sb.append("The candidate lacks several critical skills listed in the job description.\n");
            if (!missing.isEmpty()) {
                sb.append("Missing core skills: **");
                sb.append(missing.stream().limit(5).map(this::capitalizeWord).collect(Collectors.joining(", "))).append("**.\n");
            }
            sb.append("They may require significant training to be effective in this role.");
        }

        return sb.toString();
    }

    private String capitalizeWord(String word) {
        if (word == null || word.isEmpty()) return "";
        if (word.length() == 1) return word.toUpperCase();
        // Exceptions for acronyms
        if (word.equals("aws") || word.equals("gcp") || word.equals("api") || word.equals("sql") || 
            word.equals("xml") || word.equals("html") || word.equals("css") || word.equals("ui/ux") ||
            word.equals("qa") || word.equals("hr")) {
            return word.toUpperCase();
        }
        return Character.toUpperCase(word.charAt(0)) + word.substring(1);
    }
}
